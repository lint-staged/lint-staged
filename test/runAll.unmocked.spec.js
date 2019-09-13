import fs from 'fs-extra'
import normalize from 'normalize-path'
import path from 'path'
import tmp from 'tmp'

import execGitBase from '../src/execGit'
import runAll from '../src/runAll'

tmp.setGracefulCleanup()
jest.unmock('execa')

jest.setTimeout(10000)

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

// Create temporary directory by wrapping `tmp` in a Promise
const createTempDir = () =>
  new Promise((resolve, reject) => {
    tmp.dir({ keep: true, unsafeCleanup: true }, (error, name, cleanupCallback) => {
      if (error) reject(error)
      resolve({ name, cleanupCallback })
    })
  })

let cwd

// Get file content
const readFile = async (filename, dir = cwd) =>
  fs.readFile(path.join(dir, filename), { encoding: 'utf-8' })

// Append to file, creating if it doesn't exist
const appendFile = async (filename, content, dir = cwd) =>
  fs.appendFile(path.join(dir, filename), content)

// Write (over) file, creating if it doesn't exist
const writeFile = async (filename, content, dir = cwd) =>
  fs.writeFile(path.join(dir, filename), content)

// Wrap execGit to always pass `gitOps`
const execGit = async args => execGitBase(args, { cwd })

// Execute runAll before git commit to emulate lint-staged
const gitCommit = async (options, message = 'test') => {
  try {
    await runAll({ ...options, cwd, quiet: true })
    await execGit(['commit', `-m "${message}"`])
    return true
  } catch (error) {
    return false
  }
}

const fixJsConfig = { config: { '*.js': ['prettier --write', 'git add'] } }

describe('runAll', () => {
  it('should throw when not in a git directory', async () => {
    const nonGitDir = await createTempDir()
    await expect(runAll({ cwd: nonGitDir })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Current directory is not a git directory!"`
    )
    nonGitDir.cleanupCallback()
  })
})

describe('runAll', () => {
  let tmpDir

  beforeEach(async () => {
    tmpDir = await createTempDir()
    cwd = normalize(await fs.realpath(tmpDir.name))

    // Init repository with initial commit
    await execGit('init')
    await execGit(['config', 'user.name', '"test"'])
    await execGit(['config', 'user.email', '"test@test.com"'])
    await appendFile('README.md', '# Test\n')
    await execGit(['add', 'README.md'])
    await execGit(['commit', '-m initial commit'])
  })

  afterEach(async () => {
    await tmpDir.cleanupCallback()
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
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
  })

  it('Should commit entire staged file when no errors and linter modifies file', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Run lint-staged with `prettier --write` and commit pretty file
    const success = await gitCommit(fixJsConfig)
    expect(success).toEqual(true)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
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
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
    expect(await execGit(['status'])).toEqual(status)
    expect(await readFile('test.js')).toEqual(testJsFileUgly)
  })

  it('Should fail to commit entire staged file when errors from linter and linter modifies files', async () => {
    // Add unfixable file to commit so `prettier --write` breaks
    await appendFile('test.js', testJsFileUnfixable)
    await execGit(['add', 'test.js'])
    const status = await execGit(['status'])

    // Run lint-staged with `prettier --write` to break the linter
    const success = await gitCommit(fixJsConfig)
    expect(success).toEqual(false)

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
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
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

    // Latest commit contains pretty file
    // `git show` strips empty line from here here
    expect(await execGit(['show', 'HEAD:test.js'])).toEqual(testJsFilePretty.replace(/\n$/, ''))

    // Since edit was not staged, the file is still modified
    const status = await execGit(['status'])
    expect(status).toMatch('modified:   test.js')
    expect(status).toMatch('no changes added to commit')
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
    const success = await gitCommit(fixJsConfig)
    expect(success).toEqual(true)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

    // Latest commit contains pretty file
    // `git show` strips empty line from here here
    expect(await execGit(['show', 'HEAD:test.js'])).toEqual(testJsFilePretty.replace(/\n$/, ''))

    // Nothing is staged
    const status = await execGit(['status'])
    expect(status).toMatch('modified:   test.js')
    expect(status).toMatch('no changes added to commit')

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
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
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
    const success = await gitCommit(fixJsConfig)
    expect(success).toEqual(false)

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
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
    const success = await gitCommit(fixJsConfig)
    expect(success).toEqual(true)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

    // Latest commit contains pretty file
    // `git show` strips empty line from here here
    expect(await execGit(['show', 'HEAD:test.js'])).toEqual(testJsFilePretty.replace(/\n$/, ''))

    // Nothing is staged
    expect(await execGit(['status'])).toMatch('nothing to commit, working tree clean')

    // File is pretty, and has been edited
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
  })

  it('Should fail when linter creates a .git/index.lock', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Edit ugly file but do not stage changes
    const appended = '\n\nconsole.log("test");\n'
    await appendFile('test.js', appended)
    expect(await readFile('test.js')).toEqual(testJsFileUgly + appended)
    const diff = await execGit(['diff'])

    // Run lint-staged with `prettier --write` and commit pretty file
    // The task creates a git lock file to simulate failure
    const success = await gitCommit({
      config: {
        '*.js': files => [
          `touch ${cwd}/.git/index.lock`,
          `prettier --write ${files.join(' ')}`,
          `git add ${files.join(' ')}`
        ]
      }
    })
    expect(success).toEqual(false)

    // Something was wrong so new commit wasn't created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')

    // But local modifications are gone
    expect(await execGit(['diff'])).not.toEqual(diff)
    expect(await execGit(['diff'])).toMatchInlineSnapshot(`
                  "diff --git a/test.js b/test.js
                  index f80f875..1c5643c 100644
                  --- a/test.js
                  +++ b/test.js
                  @@ -1,3 +1,3 @@
                   module.exports = {
                  -    'foo': 'bar',
                  -}
                  +  foo: \\"bar\\"
                  +};"
            `)

    expect(await readFile('test.js')).not.toEqual(testJsFileUgly + appended)
    expect(await readFile('test.js')).toEqual(testJsFilePretty)

    // Remove lock file
    await fs.remove(`${cwd}/.git/index.lock`)

    // Luckily there is a stash
    expect(await execGit(['stash', 'list'])).toMatchInlineSnapshot(
      `"stash@{0}: On master: lint-staged automatic backup"`
    )
    await execGit(['reset', '--hard'])
    await execGit(['stash', 'pop', '--index'])

    expect(await execGit(['diff'])).toEqual(diff)
    expect(await readFile('test.js')).toEqual(testJsFileUgly + appended)
  })

  it('should handle merge conflicts', async () => {
    const fileInBranchA = `module.exports = "foo";\n`
    const fileInBranchB = `module.exports = 'bar'\n`
    const fileInBranchBFixed = `module.exports = "bar";\n`

    // Create one branch
    await execGit(['checkout', '-b', 'branch-a'])
    await appendFile('test.js', fileInBranchA)
    await execGit(['add', '.'])
    const successA = await gitCommit(fixJsConfig, 'commit a')
    expect(successA).toEqual(true)
    expect(await readFile('test.js')).toEqual(fileInBranchA)

    await execGit(['checkout', 'master'])

    // Create another branch
    await execGit(['checkout', '-b', 'branch-b'])
    await appendFile('test.js', fileInBranchB)
    await execGit(['add', '.'])
    const successB = await gitCommit(fixJsConfig, 'commit b')
    expect(successB).toEqual(true)
    expect(await readFile('test.js')).toEqual(fileInBranchBFixed)

    // Merge first branch
    await execGit(['checkout', 'master'])
    await execGit(['merge', 'branch-a'])
    expect(await readFile('test.js')).toEqual(fileInBranchA)
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('commit a')

    // Merge second branch, causing merge conflict
    try {
      await execGit(['merge', 'branch-b'])
    } catch ({ stdout }) {
      expect(stdout).toMatch('Merge conflict in test.js')
    }

    expect(await readFile('test.js')).toMatchInlineSnapshot(`
                  "<<<<<<< HEAD
                  module.exports = \\"foo\\";
                  =======
                  module.exports = \\"bar\\";
                  >>>>>>> branch-b
                  "
            `)

    // Fix conflict and commit using lint-staged
    await writeFile('test.js', fileInBranchB)
    expect(await readFile('test.js')).toEqual(fileInBranchB)
    await execGit(['add', '.'])

    // Do not use `gitCommit` wrapper here
    await runAll({ ...fixJsConfig, cwd, quiet: true })
    await execGit(['commit', '--no-edit'])

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('4')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatchInlineSnapshot(`
      "Merge branch 'branch-b'

      # Conflicts:
      #	test.js
      "
    `)
    expect(await readFile('test.js')).toEqual(fileInBranchBFixed)
  })
})
