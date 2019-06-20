import execa from 'execa'
import fs from 'fs'
import path from 'path'
import pify from 'pify'
import tmp from 'tmp'

import gitWorkflow from '../src/gitWorkflow'

const fsp = pify(fs)

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
let wcDirPath
let gitOpts

// Get file content
const readFile = async (filename, dir = wcDirPath) =>
  fsp.readFile(path.join(dir, filename), { encoding: 'utf-8' })

// Append to file, creating if it doesn't exist
const appendFile = async (filename, content, dir = wcDirPath) => {
  await fsp.appendFile(path.join(dir, filename), content)
}

// Wrap execGit to always pass `gitOps`
const execGit = async args => gitWorkflow.execGit(args, gitOpts)

// Emulate lint-staged in pre-commit-hook
const runLintStaged = async (fix = false) => {
  // First save backup
  await gitWorkflow.saveStagedFiles(gitOpts)

  try {
    if (fix) {
      // Run prettier with --write
      await execa('prettier', ['--write', 'test.js'], { cwd: wcDirPath })
      // add files
      await execGit(['add', 'test.js'])
    } else {
      // Run prettier
      await execa('prettier', ['--list-different', 'test.js'], { cwd: wcDirPath })
    }

    // commit
    await execGit(['commit', '-m test'])
  } catch (error) {
    // in case of linter error restore backup
    await gitWorkflow.restoreStagedFiles(gitOpts)
  }

  await gitWorkflow.clearStagedFileStash(gitOpts)
}

describe('gitWorkflow', () => {
  beforeEach(async () => {
    wcDir = tmp.dirSync({ unsafeCleanup: true })
    wcDirPath = wcDir.name
    gitOpts = { cwd: wcDirPath }

    // Init repository with initial commit
    await execGit('init')
    await execGit(['config', 'user.name', '"test"'])
    await execGit(['config', 'user.email', '"test@test.com"'])
    await appendFile('README.md', '# Test\n')
    await execGit(['add', 'README.md'])
    await execGit(['commit', '-m initial commit'])
  })

  it('Should commit file when no errors from linter', async () => {
    // Stage pretty file
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await runLintStaged()

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
  })

  it('Should commit file when no errors and linter modifies file', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Run lint-staged with `prettier --write` and commit pretty file
    await runLintStaged(true)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
  })

  it('Should fail to commit file when errors from linter', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])
    const status = await execGit(['status'])

    // Run lint-staged with `prettier --list-different` to break the linter
    await runLintStaged()

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
    expect(await execGit(['status'])).toEqual(status)
    expect(await readFile('test.js')).toEqual(testJsFileUgly)
  })

  it('Should fail to commit file when errors from linter and linter modifies files', async () => {
    // Add unfixable file to commit so `prettier --write` breaks
    await appendFile('test.js', testJsFileUnfixable)
    await execGit(['add', 'test.js'])
    const status = await execGit(['status'])

    // Run lint-staged with `prettier --write` to break the linter
    await runLintStaged(true)

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
    expect(await execGit(['status'])).toEqual(status)
    expect(await readFile('test.js')).toEqual(testJsFileUnfixable)
  })

  it('Should commit partial change when no errors from linter', async () => {
    // Stage pretty file
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])

    // Edit pretty file but do not stage changes
    const appended = '\nconsole.log("test");\n'
    await appendFile('test.js', appended)

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await runLintStaged()

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

    // Latest commit contains pretty file
    // `git show` strips empty line from here here
    expect(await execGit(['show', 'HEAD:test.js'])).toMatch(testJsFilePretty.replace(/\n$/, ''))

    // Since edit was not staged, the file is still modified
    expect(await execGit(['status'])).toMatch('modified:   test.js')
    expect(await readFile('test.js')).toMatch(testJsFilePretty + appended)
  })

  it('Should commit entire file on partial change when no errors from linter and linter modifies file', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Edit ugly file but do not stage changes
    const appended = '\nconsole.log("test");\n'
    await appendFile('test.js', appended)

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await runLintStaged(true)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

    // Latest commit contains pretty file with edits
    // `git show` strips empty line from here here
    expect(await execGit(['show', 'HEAD:test.js'])).toMatch(
      (testJsFilePretty + appended).replace(/\n$/, '')
    )

    // Nothing is staged
    expect(await execGit(['status'])).toMatch(
      'On branch master\nnothing to commit, working tree clean'
    )

    // File is pretty, and has been edited
    expect(await readFile('test.js')).toMatch(testJsFilePretty + appended)
  })

  it('Should fail to partial change when errors from linter', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Edit ugly file but do not stage changes
    const appended = '\nconsole.log("test");\n'
    await appendFile('test.js', appended)
    const status = await execGit(['status'])

    // Run lint-staged with `prettier --list-different` to break the linter
    await runLintStaged()

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
    expect(await execGit(['status'])).toEqual(status)
    expect(await readFile('test.js')).toMatch(testJsFileUgly + appended)
  })

  it('Should fail to commit partial change when errors from linter and linter modifies files', async () => {
    // Add unfixable file to commit so `prettier --write` breaks
    await appendFile('test.js', testJsFileUnfixable)
    await execGit(['add', 'test.js'])

    // Edit unfixable file but do not stage changes
    const appended = '\nconsole.log("test");\n'
    await appendFile('test.js', appended)
    const status = await execGit(['status'])

    // Run lint-staged with `prettier --write` to break the linter
    await runLintStaged(true)

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
    expect(await execGit(['status'])).toEqual(status)
    expect(await readFile('test.js')).toMatch(testJsFileUnfixable + appended)
  })

  afterEach(async () => {
    wcDir.removeCallback()
  })
})
