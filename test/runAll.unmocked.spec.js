import fs from 'fs-extra'
import path from 'path'
import tmp from 'tmp'

import execGitBase from '../src/execGit'
import runAll from '../src/runAll'

tmp.setGracefulCleanup()
jest.unmock('execa')

const testJsFilePretty = `module.exports = {
  foo: "bar"
};
`

const testJsFileUgly = `module.exports = {
    'foo': 'bar',
}
`

const testJsFileUnfixable = `const obj = {
    'foo': 'bar'
`

let wcDir
let cwd

// Get file content
const readFile = async (filename, dir = cwd) =>
  fs.readFile(path.join(dir, filename), { encoding: 'utf-8' })

// Append to file, creating if it doesn't exist
const appendFile = async (filename, content, dir = cwd) =>
  fs.appendFile(path.join(dir, filename), content)

// Wrap execGit to always pass `gitOps`
const execGit = async args => execGitBase(args, { cwd })

// Execute runAll before git commit to emulate lint-staged
const gitCommit = async options => {
  try {
    await runAll({ ...options, cwd, quiet: true })
    await execGit(['commit', '-m "test"'])
    return true
  } catch (error) {
    return false
  }
}

describe('runAll', () => {
  it('should throw when not in a git directory', async () => {
    const nonGitDir = tmp.dirSync({ unsafeCleanup: true })
    await expect(runAll({ cwd: nonGitDir })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Current directory is not a git directory!"`
    )
    nonGitDir.removeCallback()
  })
})

describe('runAll', () => {
  beforeEach(async () => {
    wcDir = tmp.dirSync({ unsafeCleanup: true })
    cwd = await fs.realpath(wcDir.name)

    // Init repository with initial commit
    await execGit('init')
    await execGit(['config', 'user.name', '"test"'])
    await execGit(['config', 'user.email', '"test@test.com"'])
    await appendFile('README.md', '# Test\n')
    await execGit(['add', 'README.md'])
    await execGit(['commit', '-m initial commit'])
  })

  it('Should commit entire staged file when no errors from linter', async () => {
    // Stage pretty file
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])

    // Run lint-staged with `prettier --list-different` and commit pretty file
    const success = await gitCommit({ config: { '*.js': 'prettier --list-different' } })
    expect(success).toEqual(true)

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatchInlineSnapshot(`
" \\"test\\"
"
`)
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
  })

  it('Should commit entire staged file when no errors and linter modifies file', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Run lint-staged with `prettier --write` and commit pretty file
    const success = await gitCommit({ config: { '*.js': ['prettier --write', 'git add'] } })
    expect(success).toEqual(true)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatchInlineSnapshot(`
" \\"test\\"
"
`)
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
  })

  it('Should fail to commit entire staged file when errors from linter', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])
    const status = await execGit(['status'])

    // Run lint-staged with `prettier --list-different` to break the linter
    const success = await gitCommit({ config: { '*.js': 'prettier --list-different' } })
    expect(success).toEqual(false)

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatchInlineSnapshot(`
" initial commit
"
`)
    expect(await execGit(['status'])).toEqual(status)
    expect(await readFile('test.js')).toEqual(testJsFileUgly)
  })

  it('Should fail to commit entire staged file when errors from linter and linter modifies files', async () => {
    // Add unfixable file to commit so `prettier --write` breaks
    await appendFile('test.js', testJsFileUnfixable)
    await execGit(['add', 'test.js'])
    const status = await execGit(['status'])

    // Run lint-staged with `prettier --write` to break the linter
    const success = await gitCommit({ config: { '*.js': ['prettier --write', 'git add'] } })
    expect(success).toEqual(false)

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatchInlineSnapshot(`
" initial commit
"
`)
    expect(await execGit(['status'])).toEqual(status)
    expect(await readFile('test.js')).toEqual(testJsFileUnfixable)
  })

  it('Should commit partial change from partially staged file when no errors from linter', async () => {
    // Stage pretty file
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])

    // Edit pretty file but do not stage changes
    const appended = '\nconsole.log("test");\n'
    await appendFile('test.js', appended)

    // Run lint-staged with `prettier --list-different` and commit pretty file
    const success = await gitCommit({ config: { '*.js': 'prettier --list-different' } })
    expect(success).toEqual(true)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatchInlineSnapshot(`
" \\"test\\"
"
`)

    // Latest commit contains pretty file
    // `git show` strips empty line from here here
    expect(await execGit(['show', 'HEAD:test.js'])).toEqual(testJsFilePretty.replace(/\n$/, ''))

    // Since edit was not staged, the file is still modified
    expect(await execGit(['status'])).toMatchInlineSnapshot(`
"On branch master
Changes not staged for commit:
  (use \\"git add <file>...\\" to update what will be committed)
  (use \\"git checkout -- <file>...\\" to discard changes in working directory)

	modified:   test.js

no changes added to commit (use \\"git add\\" and/or \\"git commit -a\\")"
`)
    expect(await readFile('test.js')).toEqual(testJsFilePretty + appended)
  })

  it('Should commit partial change from partially staged file when no errors from linter and linter modifies file', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Edit ugly file but do not stage changes
    const appended = '\n\nconsole.log("test");\n'
    await appendFile('test.js', appended)

    // Run lint-staged with `prettier --write` and commit pretty file
    const success = await gitCommit({ config: { '*.js': ['prettier --write', 'git add'] } })
    expect(success).toEqual(true)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatchInlineSnapshot(`
" \\"test\\"
"
`)

    // Latest commit contains pretty file
    // `git show` strips empty line from here here
    expect(await execGit(['show', 'HEAD:test.js'])).toEqual(testJsFilePretty.replace(/\n$/, ''))

    // Nothing is staged
    expect(await execGit(['status'])).toMatchInlineSnapshot(`
"On branch master
Changes not staged for commit:
  (use \\"git add <file>...\\" to update what will be committed)
  (use \\"git checkout -- <file>...\\" to discard changes in working directory)

	modified:   test.js

no changes added to commit (use \\"git add\\" and/or \\"git commit -a\\")"
`)

    // File is pretty, and has been edited
    expect(await readFile('test.js')).toEqual(testJsFilePretty + appended)
  })

  it('Should fail to commit partial change from partially staged file when errors from linter', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Edit ugly file but do not stage changes
    const appended = '\nconsole.log("test");\n'
    await appendFile('test.js', appended)
    const status = await execGit(['status'])

    // Run lint-staged with `prettier --list-different` to break the linter
    const success = await gitCommit({ config: { '*.js': 'prettier --list-different' } })
    expect(success).toEqual(false)

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatchInlineSnapshot(`
" initial commit
"
`)
    expect(await execGit(['status'])).toEqual(status)
    expect(await readFile('test.js')).toEqual(testJsFileUgly + appended)
  })

  it('Should fail to commit partial change from partially staged file when errors from linter and linter modifies files', async () => {
    // Add unfixable file to commit so `prettier --write` breaks
    await appendFile('test.js', testJsFileUnfixable)
    await execGit(['add', 'test.js'])

    // Edit unfixable file but do not stage changes
    const appended = '\nconsole.log("test");\n'
    await appendFile('test.js', appended)
    const status = await execGit(['status'])

    // Run lint-staged with `prettier --write` to break the linter
    const success = await gitCommit({ config: { '*.js': ['prettier --write', 'git add'] } })
    expect(success).toEqual(false)

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatchInlineSnapshot(`
" initial commit
"
`)
    expect(await execGit(['status'])).toEqual(status)
    expect(await readFile('test.js')).toEqual(testJsFileUnfixable + appended)
  })

  it('Should clear unstaged changes when linter applies same changes', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Replace ugly file with pretty but do not stage changes
    await fs.remove(path.join(cwd, 'test.js'))
    await appendFile('test.js', testJsFilePretty)

    // Run lint-staged with `prettier --write` and commit pretty file
    const success = await gitCommit({ config: { '*.js': ['prettier --write', 'git add'] } })
    expect(success).toEqual(true)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatchInlineSnapshot(`
" \\"test\\"
"
`)

    // Latest commit contains pretty file
    // `git show` strips empty line from here here
    expect(await execGit(['show', 'HEAD:test.js'])).toEqual(testJsFilePretty.replace(/\n$/, ''))

    // Nothing is staged
    expect(await execGit(['status'])).toMatchInlineSnapshot(`
"On branch master
nothing to commit, working tree clean"
`)

    // File is pretty, and has been edited
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
  })

  afterEach(async () => {
    wcDir.removeCallback()
  })
})
