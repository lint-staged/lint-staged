import path from 'path'

import makeConsoleMock from 'consolemock'
import fs from 'fs-extra'
import ansiSerializer from 'jest-snapshot-serializer-ansi'
import normalize from 'normalize-path'

jest.unmock('lilconfig')
jest.unmock('execa')

jest.mock('../lib/resolveConfig', () => ({
  /** Unfortunately necessary due to non-ESM tests. */
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))

jest.mock('../lib/dynamicImport', () => ({
  // 'pathToFileURL' is not supported with Jest + Babel
  dynamicImport: jest.fn().mockImplementation(async (input) => require(input)),
}))

import { execGit as execGitBase } from '../lib/execGit'
import lintStaged from '../lib/index'

import { replaceSerializer } from './utils/replaceSerializer'
import { createTempDir } from './utils/tempDir'
import { isWindows, isWindowsActions, normalizeWindowsNewlines } from './utils/crossPlatform'

jest.setTimeout(20000)
jest.retryTimes(2)

// Replace path like `../../git/lint-staged` with `<path>/lint-staged`
const replaceConfigPathSerializer = replaceSerializer(
  /((?:\.\.\/)+).*\/lint-staged/gm,
  `<path>/lint-staged`
)

// Hide filepath from test snapshot because it's not important and varies in CI
const replaceFilepathSerializer = replaceSerializer(
  /prettier --write (.*)?$/gm,
  `prettier --write <path>`
)

// Awkwardly merge three serializers
expect.addSnapshotSerializer({
  test: (val) =>
    ansiSerializer.test(val) ||
    replaceConfigPathSerializer.test(val) ||
    replaceFilepathSerializer.test(val),
  print: (val, serialize) =>
    replaceFilepathSerializer.print(
      replaceConfigPathSerializer.print(ansiSerializer.print(val, serialize))
    ),
})

const testJsFilePretty = `module.exports = {
  foo: "bar",
};
`

const testJsFileUgly = `module.exports = {
    'foo': 'bar'
}
`

const testJsFileUnfixable = `const obj = {
    'foo': 'bar'
`

const fixJsConfig = { config: { '*.js': 'prettier --write' } }

let tmpDir
let cwd

const ensureDir = async (inputPath) => fs.ensureDir(path.dirname(inputPath))

// Get file content, coercing Windows `\r\n` newlines to `\n`
const readFile = async (filename, dir = cwd) => {
  const filepath = path.isAbsolute(filename) ? filename : path.join(dir, filename)
  const file = await fs.readFile(filepath, { encoding: 'utf-8' })
  return normalizeWindowsNewlines(file)
}

// Append to file, creating if it doesn't exist
const appendFile = async (filename, content, dir = cwd) => {
  const filepath = path.isAbsolute(filename) ? filename : path.join(dir, filename)
  await ensureDir(filepath)
  await fs.appendFile(filepath, content)
}

// Write (over) file, creating if it doesn't exist
const writeFile = async (filename, content, dir = cwd) => {
  const filepath = path.isAbsolute(filename) ? filename : path.join(dir, filename)
  await ensureDir(filepath)
  await fs.writeFile(filepath, content)
}

// Wrap execGit to always pass `gitOps`
const execGit = async (args, options = {}) => execGitBase(args, { cwd, ...options })

/**
 * Execute lintStaged before git commit to emulate lint-staged cli.
 * The Node.js API doesn't throw on failures, but will return `false`.
 */
const gitCommit = async (options, args = ['-m test']) => {
  const passed = await lintStaged({ cwd, ...options })
  if (!passed) throw new Error('lint-staged failed')
  await execGit(['commit', ...args], { cwd, ...options })
}

describe('lint-staged', () => {
  it('should fail when not in a git directory', async () => {
    const nonGitDir = await createTempDir()
    const logger = makeConsoleMock()
    await expect(lintStaged({ ...fixJsConfig, cwd: nonGitDir }, logger)).resolves.toEqual(false)
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR ✖ Current directory is not a git directory!"
    `)
    await fs.remove(nonGitDir)
  })

  it('should fail without output when not in a git directory and quiet', async () => {
    const nonGitDir = await createTempDir()
    const logger = makeConsoleMock()
    await expect(
      lintStaged({ ...fixJsConfig, cwd: nonGitDir, quiet: true }, logger)
    ).resolves.toEqual(false)
    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
    await fs.remove(nonGitDir)
  })
})

const globalConsoleTemp = console

// Tests should be resilient to `git config init.defaultBranch` that is _not_ "master"
let defaultBranchName = 'UNSET'

describe('lint-staged', () => {
  beforeAll(() => {
    console = makeConsoleMock()
  })

  beforeEach(async () => {
    tmpDir = await createTempDir()
    cwd = normalize(tmpDir)
    // Init repository with initial commit
    await execGit('init')
    await execGit(['config', 'user.name', '"test"'])
    await execGit(['config', 'user.email', '"test@test.com"'])
    if (isWindowsActions()) await execGit(['config', 'core.autocrlf', 'input'])
    await appendFile('README.md', '# Test\n')
    await execGit(['add', 'README.md'])
    await execGit(['commit', '-m initial commit'])

    if (defaultBranchName === 'UNSET') {
      defaultBranchName = await execGit(['rev-parse', '--abbrev-ref', 'HEAD'])
    }
  })

  afterEach(async () => {
    console.clearHistory()
    await fs.remove(tmpDir)
  })

  afterAll(() => {
    console = globalConsoleTemp
  })

  it('should exit early with no staged files', async () => {
    expect(() => lintStaged({ config: { '*.js': 'echo success' }, cwd })).resolves
  })

  it('Should commit entire staged file when no errors from linter', async () => {
    // Stage pretty file
    await appendFile('test file.js', testJsFilePretty)
    await execGit(['add', 'test file.js'])

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await gitCommit({ config: { '*.js': 'prettier --list-different' } })

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test file.js')).toEqual(testJsFilePretty)
  })

  it('Should commit entire staged file when no errors and linter modifies file', async () => {
    // Stage multiple ugly files
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    await appendFile('test2.js', testJsFileUgly)
    await execGit(['add', 'test2.js'])

    // Run lint-staged with `prettier --write` and commit pretty file
    await gitCommit(fixJsConfig)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
    expect(await readFile('test2.js')).toEqual(testJsFilePretty)
  })

  it('Should fail to commit entire staged file when errors from linter', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])
    const status = await execGit(['status'])

    // Run lint-staged with `prettier --list-different` to break the linter
    try {
      await gitCommit({ config: { '*.js': 'prettier --list-different' } })
    } catch (error) {
      expect(error.message).toMatchInlineSnapshot(`"lint-staged failed"`)
    }

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
    try {
      await gitCommit(fixJsConfig)
    } catch (error) {
      expect(error.message).toMatchInlineSnapshot(`"lint-staged failed"`)
    }

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
    expect(await execGit(['status'])).toEqual(status)
    expect(await readFile('test.js')).toEqual(testJsFileUnfixable)
  })

  it('Should fail to commit entire staged file when there are unrecoverable merge conflicts', async () => {
    // Stage file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Run lint-staged with action that does horrible things to the file, causing a merge conflict
    const testFile = path.resolve(cwd, 'test.js')
    await expect(
      gitCommit({
        config: {
          '*.js': () => {
            fs.writeFileSync(testFile, Buffer.from(testJsFileUnfixable, 'binary'))
            return `prettier --write ${testFile}`
          },
        },
      })
    ).rejects.toThrowError()

    expect(console.printHistory()).toMatch(
      'Unstaged changes could not be restored due to a merge conflict!'
    )

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
    // Git status is a bit messed up because the horrible things we did
    // in the config above were done before creating the initial backup stash,
    // and thus included in it.
    expect(await execGit(['status', '--porcelain'])).toMatchInlineSnapshot(`"AM test.js"`)
  })

  it('Should commit partial change from partially staged file when no errors from linter', async () => {
    // Stage pretty file
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])

    // Edit pretty file but do not stage changes
    const appended = `\nconsole.log("test");\n`
    await appendFile('test.js', appended)

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await gitCommit({ config: { '*.js': 'prettier --list-different' } })

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG [STARTED] Preparing lint-staged...
      LOG [SUCCESS] Preparing lint-staged...
      LOG [STARTED] Hiding unstaged changes to partially staged files...
      LOG [SUCCESS] Hiding unstaged changes to partially staged files...
      LOG [STARTED] Running tasks for staged files...
      LOG [STARTED] Config object — 1 file
      LOG [STARTED] *.js — 1 file
      LOG [STARTED] prettier --list-different
      LOG [SUCCESS] prettier --list-different
      LOG [SUCCESS] *.js — 1 file
      LOG [SUCCESS] Config object — 1 file
      LOG [SUCCESS] Running tasks for staged files...
      LOG [STARTED] Applying modifications from tasks...
      LOG [SUCCESS] Applying modifications from tasks...
      LOG [STARTED] Restoring unstaged changes to partially staged files...
      LOG [SUCCESS] Restoring unstaged changes to partially staged files...
      LOG [STARTED] Cleaning up temporary files...
      LOG [SUCCESS] Cleaning up temporary files..."
    `)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

    // Latest commit contains pretty file
    // `git show` strips empty line from here here
    expect(await execGit(['show', 'HEAD:test.js'])).toEqual(testJsFilePretty.trim())

    // Since edit was not staged, the file is still modified
    const status = await execGit(['status'])
    expect(status).toMatch('modified:   test.js')
    expect(status).toMatch('no changes added to commit')
    /** @todo `git` in GitHub Windows runners seem to add `\r\n` newlines in this case. */
    expect(normalizeWindowsNewlines(await readFile('test.js'))).toEqual(testJsFilePretty + appended)
  })

  it('Should commit partial change from partially staged file when no errors from linter and linter modifies file', async () => {
    // Stage ugly file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Edit ugly file but do not stage changes
    const appended = '\n\nconsole.log("test");\n'
    await appendFile('test.js', appended)

    // Run lint-staged with `prettier --write` and commit pretty file
    await gitCommit(fixJsConfig)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

    // Latest commit contains pretty file
    // `git show` strips empty line from here here
    expect(await execGit(['show', 'HEAD:test.js'])).toEqual(testJsFilePretty.trim())

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
    await expect(
      gitCommit({ config: { '*.js': 'prettier --list-different' } })
    ).rejects.toThrowError()

    const output = console.printHistory()
    expect(output).toMatch('Reverting to original state because of errors')

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
    try {
      await gitCommit(fixJsConfig)
    } catch (error) {
      expect(error.message).toMatchInlineSnapshot(`"lint-staged failed"`)
    }

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
    await gitCommit(fixJsConfig)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

    // Latest commit contains pretty file
    // `git show` strips empty line from here here
    expect(await execGit(['show', 'HEAD:test.js'])).toEqual(testJsFilePretty.trim())

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
    // The task creates a git lock file and runs `git add` to simulate failure
    await expect(
      gitCommit({
        shell: isWindows,
        config: {
          '*.js': (files) => [
            `${isWindows ? 'type nul >' : 'touch'} ${cwd}/.git/index.lock`,
            `prettier --write ${files.join(' ')}`,
            `git add ${files.join(' ')}`,
          ],
        },
      })
    ).rejects.toThrowError()

    const output = console.printHistory()
    expect(output).toMatch('Another git process seems to be running in this repository')

    // Something was wrong so new commit wasn't created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')

    // But local modifications are gone
    expect(await execGit(['diff'])).not.toEqual(diff)
    expect(await execGit(['diff'])).toMatchInlineSnapshot(`
      "diff --git a/test.js b/test.js
      index 1eff6a0..8baadc8 100644
      --- a/test.js
      +++ b/test.js
      @@ -1,3 +1,3 @@
       module.exports = {
      -    'foo': 'bar'
      -}
      +  foo: \\"bar\\",
      +};"
    `)

    expect(await readFile('test.js')).not.toEqual(testJsFileUgly + appended)
    expect(await readFile('test.js')).toEqual(testJsFilePretty)

    // Remove lock file
    await fs.remove(`${cwd}/.git/index.lock`)

    // Luckily there is a stash
    expect(await execGit(['stash', 'list'])).toMatchInlineSnapshot(
      `"stash@{0}: lint-staged automatic backup"`
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
    await gitCommit(fixJsConfig, ['-m commit a'])
    expect(await readFile('test.js')).toEqual(fileInBranchA)

    await execGit(['checkout', defaultBranchName])

    // Create another branch
    await execGit(['checkout', '-b', 'branch-b'])
    await appendFile('test.js', fileInBranchB)
    await execGit(['add', '.'])
    await gitCommit(fixJsConfig, ['-m commit b'])
    expect(await readFile('test.js')).toEqual(fileInBranchBFixed)

    // Merge first branch
    await execGit(['checkout', defaultBranchName])
    await execGit(['merge', 'branch-a'])
    expect(await readFile('test.js')).toEqual(fileInBranchA)
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('commit a')

    // Merge second branch, causing merge conflict
    try {
      await execGit(['merge', 'branch-b'])
    } catch (error) {
      expect(error.message).toMatch('Merge conflict in test.js')
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
    await lintStaged({ ...fixJsConfig, cwd, quiet: true })
    await execGit(['commit', '--no-edit'])

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('4')
    const log = await execGit(['log', '-1', '--pretty=%B'])
    expect(log).toMatch(`Merge branch 'branch-b`)
    expect(log).toMatch(`Conflicts:`)
    expect(log).toMatch(`test.js`)
    expect(await readFile('test.js')).toEqual(fileInBranchBFixed)
  })

  it('should handle merge conflict when task errors', async () => {
    const fileInBranchA = `module.exports = "foo";\n`
    const fileInBranchB = `module.exports = 'bar'\n`
    const fileInBranchBFixed = `module.exports = "bar";\n`

    // Create one branch
    await execGit(['checkout', '-b', 'branch-a'])
    await appendFile('test.js', fileInBranchA)
    await execGit(['add', '.'])
    await gitCommit(fixJsConfig, ['-m commit a'])
    expect(await readFile('test.js')).toEqual(fileInBranchA)

    await execGit(['checkout', defaultBranchName])

    // Create another branch
    await execGit(['checkout', '-b', 'branch-b'])
    await appendFile('test.js', fileInBranchB)
    await execGit(['add', '.'])
    await gitCommit(fixJsConfig, ['-m commit b'])
    expect(await readFile('test.js')).toEqual(fileInBranchBFixed)

    // Merge first branch
    await execGit(['checkout', defaultBranchName])
    await execGit(['merge', 'branch-a'])
    expect(await readFile('test.js')).toEqual(fileInBranchA)
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('commit a')

    // Merge second branch, causing merge conflict
    await expect(execGit(['merge', 'branch-b'])).rejects.toThrowError('Merge conflict in test.js')

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
    await expect(
      lintStaged({ config: { '*.js': 'prettier --list-different' }, cwd, quiet: true })
    ).resolves.toEqual(false) // Did not pass so returns `false`

    // Something went wrong, so lintStaged failed and merge is still going
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['status'])).toMatch('All conflicts fixed but you are still merging')
    expect(await readFile('test.js')).toEqual(fileInBranchB)
  })

  it('should keep untracked files', async () => {
    // Stage pretty file
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])

    // Add untracked files
    await appendFile('test-untracked.js', testJsFilePretty)
    await appendFile('.gitattributes', 'binary\n')
    await writeFile('binary', Buffer.from('Hello, World!', 'binary'))

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await gitCommit({ config: { '*.js': 'prettier --list-different' } })

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
    expect(await readFile('test-untracked.js')).toEqual(testJsFilePretty)
    expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
  })

  it('should keep untracked files when taks fails', async () => {
    // Stage unfixable file
    await appendFile('test.js', testJsFileUnfixable)
    await execGit(['add', 'test.js'])

    // Add untracked files
    await appendFile('test-untracked.js', testJsFilePretty)
    await appendFile('.gitattributes', 'binary\n')
    await writeFile('binary', Buffer.from('Hello, World!', 'binary'))

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await expect(
      gitCommit({ config: { '*.js': 'prettier --list-different' } })
    ).rejects.toThrowError()

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
    expect(await readFile('test.js')).toEqual(testJsFileUnfixable)
    expect(await readFile('test-untracked.js')).toEqual(testJsFilePretty)
    expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
  })

  it('should work when amending previous commit with unstaged changes', async () => {
    // Edit file from previous commit
    await appendFile('README.md', '\n## Amended\n')
    await execGit(['add', 'README.md'])

    // Edit again, but keep it unstaged
    await appendFile('README.md', '\n## Edited\n')
    await appendFile('test-untracked.js', testJsFilePretty)

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await gitCommit({ config: { '*.{js,md}': 'prettier --list-different' } }, [
      '--amend',
      '--no-edit',
    ])

    // Nothing is wrong, so the commit was amended
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
    expect(await readFile('README.md')).toMatchInlineSnapshot(`
                        "# Test

                        ## Amended

                        ## Edited
                        "
                `)
    expect(await readFile('test-untracked.js')).toEqual(testJsFilePretty)
    const status = await execGit(['status'])
    expect(status).toMatch('modified:   README.md')
    expect(status).toMatch('test-untracked.js')
    expect(status).toMatch('no changes added to commit')
  })

  it('should not resurrect removed files due to git bug when tasks pass', async () => {
    const readmeFile = path.resolve(cwd, 'README.md')
    await fs.remove(readmeFile) // Remove file from previous commit
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])
    await lintStaged({ cwd, config: { '*.{js,md}': 'prettier --list-different' } })
    const exists = await fs.exists(readmeFile)
    expect(exists).toEqual(false)
  })

  it('should not resurrect removed files in complex case', async () => {
    // Add file to index, and remove it from disk
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])
    const testFile = path.resolve(cwd, 'test.js')
    await fs.remove(testFile)

    // Rename file in index, and remove it from disk
    const readmeFile = path.resolve(cwd, 'README.md')
    const readme = await readFile(readmeFile)
    await fs.remove(readmeFile)
    await execGit(['add', readmeFile])
    const newReadmeFile = path.resolve(cwd, 'README_NEW.md')
    await appendFile(newReadmeFile, readme)
    await execGit(['add', newReadmeFile])
    await fs.remove(newReadmeFile)

    const status = await execGit(['status', '--porcelain'])
    expect(status).toMatchInlineSnapshot(`
      "RD README.md -> README_NEW.md
      AD test.js"
    `)

    await lintStaged({ cwd, config: { '*.{js,md}': 'prettier --list-different' } })
    expect(await fs.exists(testFile)).toEqual(false)
    expect(await fs.exists(newReadmeFile)).toEqual(false)
    expect(await execGit(['status', '--porcelain'])).toEqual(status)
  })

  it('should not resurrect removed files due to git bug when tasks fail', async () => {
    const readmeFile = path.resolve(cwd, 'README.md')
    await fs.remove(readmeFile) // Remove file from previous commit
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])
    await expect(
      lintStaged({ allowEmpty: true, cwd, config: { '*.{js,md}': 'prettier --list-different' } })
    ).resolves.toEqual(false)
    const exists = await fs.exists(readmeFile)
    expect(exists).toEqual(false)
  })

  it('should handle binary files', async () => {
    // mark file as binary
    await appendFile('.gitattributes', 'binary\n')

    // Stage pretty file
    await writeFile('binary', Buffer.from('Hello, World!', 'binary'))
    await execGit(['add', 'binary'])

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await gitCommit({ config: { '*.js': 'prettier --list-different' } })

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
  })

  it('should run chunked tasks when necessary', async () => {
    // Stage two files
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])
    await appendFile('test2.js', testJsFilePretty)
    await execGit(['add', 'test2.js'])

    // Run lint-staged with `prettier --list-different` and commit pretty file
    // Set maxArgLength low enough so that chunking is used
    await gitCommit({ config: { '*.js': 'prettier --list-different' }, maxArgLength: 10 })

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
    expect(await readFile('test2.js')).toEqual(testJsFilePretty)
  })

  it('should fail when backup stash is missing', async () => {
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])

    // Remove backup stash during run
    await expect(
      gitCommit({ config: { '*.js': () => 'git stash drop' }, shell: true })
    ).rejects.toThrowError()

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG [STARTED] Preparing lint-staged...
      LOG [SUCCESS] Preparing lint-staged...
      LOG [STARTED] Running tasks for staged files...
      LOG [STARTED] Config object — 1 file
      LOG [STARTED] *.js — 1 file
      LOG [STARTED] git stash drop
      LOG [SUCCESS] git stash drop
      LOG [SUCCESS] *.js — 1 file
      LOG [SUCCESS] Config object — 1 file
      LOG [SUCCESS] Running tasks for staged files...
      LOG [STARTED] Applying modifications from tasks...
      LOG [SUCCESS] Applying modifications from tasks...
      LOG [STARTED] Cleaning up temporary files...
      ERROR [FAILED] lint-staged automatic backup is missing!"
    `)
  })

  it('should fail when task reverts staged changes, to prevent an empty git commit', async () => {
    // Create and commit a pretty file without running lint-staged
    // This way the file will be available for the next step
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])
    await execGit(['commit', '-m committed pretty file'])

    // Edit file to be ugly
    await fs.remove(path.resolve(cwd, 'test.js'))
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Run lint-staged with prettier --write to automatically fix the file
    // Since prettier reverts all changes, the commit should fail
    // use the old syntax with manual `git add` to provide a warning message
    await expect(
      gitCommit({ config: { '*.js': ['prettier --write', 'git add'] } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ⚠ Some of your tasks use \`git add\` command. Please remove it from the config since all modifications made by tasks will be automatically added to the git commit index.

      LOG [STARTED] Preparing lint-staged...
      LOG [SUCCESS] Preparing lint-staged...
      LOG [STARTED] Running tasks for staged files...
      LOG [STARTED] Config object — 1 file
      LOG [STARTED] *.js — 1 file
      LOG [STARTED] prettier --write
      LOG [SUCCESS] prettier --write
      LOG [STARTED] git add
      LOG [SUCCESS] git add
      LOG [SUCCESS] *.js — 1 file
      LOG [SUCCESS] Config object — 1 file
      LOG [SUCCESS] Running tasks for staged files...
      LOG [STARTED] Applying modifications from tasks...
      ERROR [FAILED] Prevented an empty git commit!
      LOG [STARTED] Reverting to original state because of errors...
      LOG [SUCCESS] Reverting to original state because of errors...
      LOG [STARTED] Cleaning up temporary files...
      LOG [SUCCESS] Cleaning up temporary files...
      WARN 
        ⚠ lint-staged prevented an empty git commit.
        Use the --allow-empty option to continue, or check your task configuration
      "
    `)

    // Something was wrong so the repo is returned to original state
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('committed pretty file')
    expect(await readFile('test.js')).toEqual(testJsFileUgly)
  })

  it('should create commit when task reverts staged changed and --allow-empty is used', async () => {
    // Create and commit a pretty file without running lint-staged
    // This way the file will be available for the next step
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])
    await execGit(['commit', '-m committed pretty file'])

    // Edit file to be ugly
    await writeFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Run lint-staged with prettier --write to automatically fix the file
    // Here we also pass '--allow-empty' to gitCommit because this part is not the full lint-staged
    await gitCommit({ allowEmpty: true, config: { '*.js': 'prettier --write' } }, [
      '-m test',
      '--allow-empty',
    ])

    // Nothing was wrong so the empty commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('3')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await execGit(['diff', '-1'])).toEqual('')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
  })

  it('should handle git submodules', async () => {
    // create a new repo for the git submodule to a temp path
    let submoduleDir = path.resolve(cwd, 'submodule-temp')
    await fs.ensureDir(submoduleDir)
    await execGit('init', { cwd: submoduleDir })
    await execGit(['config', 'user.name', '"test"'], { cwd: submoduleDir })
    await execGit(['config', 'user.email', '"test@test.com"'], { cwd: submoduleDir })
    await appendFile('README.md', '# Test\n', submoduleDir)
    await execGit(['add', 'README.md'], { cwd: submoduleDir })
    await execGit(['commit', '-m initial commit'], { cwd: submoduleDir })

    // Add the newly-created repo as a submodule in a new path.
    // This simulates adding it from a remote
    await execGit(['submodule', 'add', '--force', './submodule-temp', './submodule'])
    submoduleDir = path.resolve(cwd, 'submodule')
    // Set these again for Windows git in CI
    await execGit(['config', 'user.name', '"test"'], { cwd: submoduleDir })
    await execGit(['config', 'user.email', '"test@test.com"'], { cwd: submoduleDir })

    // Stage pretty file
    await appendFile('test.js', testJsFilePretty, submoduleDir)
    await execGit(['add', 'test.js'], { cwd: submoduleDir })

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await lintStaged({ config: { '*.js': 'prettier --list-different' }, cwd: submoduleDir })
    await execGit(['commit', '-m test'], { cwd: submoduleDir })

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'], { cwd: submoduleDir })).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'], { cwd: submoduleDir })).toMatch('test')
    expect(await readFile('test.js', submoduleDir)).toEqual(testJsFilePretty)
  })

  it('should handle git worktrees', async () => {
    // create a new branch and add it as worktree
    const workTreeDir = path.resolve(cwd, 'worktree')
    await execGit(['branch', 'test'])
    await execGit(['worktree', 'add', workTreeDir, 'test'])

    // Stage pretty file
    await appendFile('test.js', testJsFilePretty, workTreeDir)
    await execGit(['add', 'test.js'], { cwd: workTreeDir })

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await lintStaged({ config: { '*.js': 'prettier --list-different' }, cwd: workTreeDir })
    await execGit(['commit', '-m test'], { cwd: workTreeDir })

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'], { cwd: workTreeDir })).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'], { cwd: workTreeDir })).toMatch('test')
    expect(await readFile('test.js', workTreeDir)).toEqual(testJsFilePretty)
  })

  test.each([['on'], ['off']])(
    'should handle files with non-ascii characters when core.quotepath is %s',
    async (quotePath) => {
      await execGit(['config', 'core.quotepath', quotePath])

      // Stage multiple ugly files
      await appendFile('привет.js', testJsFileUgly)
      await execGit(['add', 'привет.js'])

      await appendFile('你好.js', testJsFileUgly)
      await execGit(['add', '你好.js'])

      await appendFile('👋.js', testJsFileUgly)
      await execGit(['add', '👋.js'])

      // Run lint-staged with `prettier --write` and commit pretty files
      await gitCommit(fixJsConfig)

      // Nothing is wrong, so a new commit is created and files are pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('привет.js')).toEqual(testJsFilePretty)
      expect(await readFile('你好.js')).toEqual(testJsFilePretty)
      expect(await readFile('👋.js')).toEqual(testJsFilePretty)
    }
  )

  it('should skip backup and revert with --no-backup', async () => {
    // Stage pretty file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Run lint-staged with --no-stash
    await gitCommit({
      ...fixJsConfig,
      stash: false,
    })

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ⚠ Skipping backup because \`--no-stash\` was used.

      LOG [STARTED] Preparing lint-staged...
      LOG [SUCCESS] Preparing lint-staged...
      LOG [STARTED] Running tasks for staged files...
      LOG [STARTED] Config object — 1 file
      LOG [STARTED] *.js — 1 file
      LOG [STARTED] prettier --write
      LOG [SUCCESS] prettier --write
      LOG [SUCCESS] *.js — 1 file
      LOG [SUCCESS] Config object — 1 file
      LOG [SUCCESS] Running tasks for staged files...
      LOG [STARTED] Applying modifications from tasks...
      LOG [SUCCESS] Applying modifications from tasks..."
    `)

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
  })

  it('should abort commit without reverting with --no-stash 1', async () => {
    // Stage file
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    // Run lint-staged with action that does horrible things to the file, causing a merge conflict
    const testFile = path.resolve(cwd, 'test.js')
    await expect(
      gitCommit({
        config: {
          '*.js': () => {
            fs.writeFileSync(testFile, Buffer.from(testJsFileUnfixable, 'binary'))
            return `prettier --write ${testFile}`
          },
        },
        stash: false,
      })
    ).rejects.toThrowError()

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ⚠ Skipping backup because \`--no-stash\` was used.

      LOG [STARTED] Preparing lint-staged...
      LOG [SUCCESS] Preparing lint-staged...
      LOG [STARTED] Hiding unstaged changes to partially staged files...
      LOG [SUCCESS] Hiding unstaged changes to partially staged files...
      LOG [STARTED] Running tasks for staged files...
      LOG [STARTED] Config object — 1 file
      LOG [STARTED] *.js — 1 file
      LOG [STARTED] prettier --write <path>
      LOG [SUCCESS] prettier --write <path>
      LOG [SUCCESS] *.js — 1 file
      LOG [SUCCESS] Config object — 1 file
      LOG [SUCCESS] Running tasks for staged files...
      LOG [STARTED] Applying modifications from tasks...
      LOG [SUCCESS] Applying modifications from tasks...
      LOG [STARTED] Restoring unstaged changes to partially staged files...
      ERROR [FAILED] Unstaged changes could not be restored due to a merge conflict!
      ERROR 
        ✖ lint-staged failed due to a git error."
    `)

    // Something was wrong so the commit was aborted
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
    expect(await execGit(['status', '--porcelain'])).toMatchInlineSnapshot(`"UU test.js"`)
    // Without revert, the merge conflict is left in-place
    expect(await readFile('test.js')).toMatchInlineSnapshot(`
      "<<<<<<< ours
      module.exports = {
        foo: \\"bar\\",
      };
      =======
      const obj = {
          'foo': 'bar'
      >>>>>>> theirs
      "
    `)
  })

  it('should abort commit without reverting with --no-stash 2', async () => {
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])
    await appendFile('test2.js', testJsFileUnfixable)
    await execGit(['add', 'test2.js'])

    // Run lint-staged with --no-stash
    await expect(
      gitCommit({
        ...fixJsConfig,
        stash: false,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    const output = console.printHistory()
    expect(output).toMatch('Skipping backup because `--no-stash` was used')

    // Something was wrong, so the commit was aborted
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
    expect(await readFile('test.js')).toEqual(testJsFilePretty) // file was still fixed
    expect(await readFile('test2.js')).toEqual(testJsFileUnfixable)
  })

  it('should handle files that begin with dash', async () => {
    await appendFile('--looks-like-flag.js', testJsFileUgly)
    await execGit(['add', '--', '--looks-like-flag.js'])
    await expect(gitCommit(fixJsConfig)).resolves.toEqual(undefined)
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await readFile('--looks-like-flag.js')).toEqual(testJsFilePretty)
  })

  it('should work when a branch named stash exists', async () => {
    // create a new branch called stash
    await execGit(['branch', 'stash'])

    // Stage multiple ugly files
    await appendFile('test.js', testJsFileUgly)
    await execGit(['add', 'test.js'])

    await appendFile('test2.js', testJsFileUgly)
    await execGit(['add', 'test2.js'])

    // Run lint-staged with `prettier --write` and commit pretty file
    await gitCommit(fixJsConfig)

    // Nothing is wrong, so a new commit is created and file is pretty
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
    expect(await readFile('test2.js')).toEqual(testJsFilePretty)
  })

  it('should support multiple configuration files', async () => {
    // Add some empty files
    await writeFile('file.js', '')
    await writeFile('deeper/file.js', '')
    await writeFile('deeper/even/file.js', '')
    await writeFile('deeper/even/deeper/file.js', '')
    await writeFile('a/very/deep/file/path/file.js', '')

    const echoJSConfig = (echo) =>
      `module.exports = { '*.js': (files) => files.map((f) => \`echo ${echo} > \${f}\`) }`

    await writeFile('.lintstagedrc.js', echoJSConfig('level-0'))
    await writeFile('deeper/.lintstagedrc.js', echoJSConfig('level-1'))
    await writeFile('deeper/even/.lintstagedrc.cjs', echoJSConfig('level-2'))

    // Stage all files
    await execGit(['add', '.'])

    // Run lint-staged with `--shell` so that tasks do their thing
    await gitCommit({ shell: true })

    // 'file.js' matched '.lintstagedrc.json'
    expect(await readFile('file.js')).toMatch('level-0')

    // 'deeper/file.js' matched 'deeper/.lintstagedrc.json'
    expect(await readFile('deeper/file.js')).toMatch('level-1')

    // 'deeper/even/file.js' matched 'deeper/even/.lintstagedrc.json'
    expect(await readFile('deeper/even/file.js')).toMatch('level-2')

    // 'deeper/even/deeper/file.js' matched from parent 'deeper/even/.lintstagedrc.json'
    expect(await readFile('deeper/even/deeper/file.js')).toMatch('level-2')

    // 'a/very/deep/file/path/file.js' matched '.lintstagedrc.json'
    expect(await readFile('a/very/deep/file/path/file.js')).toMatch('level-0')
  })

  it('should support multiple configuration files with --relative', async () => {
    // Add some empty files
    await writeFile('file.js', '')
    await writeFile('deeper/file.js', '')
    await writeFile('deeper/even/file.js', '')
    await writeFile('deeper/even/deeper/file.js', '')
    await writeFile('a/very/deep/file/path/file.js', '')

    const echoJSConfig = `module.exports = { '*.js': (files) => files.map((f) => \`echo \${f} > \${f}\`) }`

    await writeFile('.lintstagedrc.js', echoJSConfig)
    await writeFile('deeper/.lintstagedrc.js', echoJSConfig)
    await writeFile('deeper/even/.lintstagedrc.cjs', echoJSConfig)

    // Stage all files
    await execGit(['add', '.'])

    // Run lint-staged with `--shell` so that tasks do their thing
    await gitCommit({ relative: true, shell: true })

    // 'file.js' is relative to '.'
    expect(await readFile('file.js')).toMatch('file.js')

    // 'deeper/file.js' is relative to 'deeper/'
    expect(await readFile('deeper/file.js')).toMatch('file.js')

    // 'deeper/even/file.js' is relative to 'deeper/even/'
    expect(await readFile('deeper/even/file.js')).toMatch('file.js')

    // 'deeper/even/deeper/file.js' is relative to parent 'deeper/even/'
    expect(await readFile('deeper/even/deeper/file.js')).toMatch(normalize('deeper/file.js'))

    // 'a/very/deep/file/path/file.js' is relative to root '.'
    expect(await readFile('a/very/deep/file/path/file.js')).toMatch(
      normalize('a/very/deep/file/path/file.js')
    )
  })

  it('should ignore multiple configs files outside cwd', async () => {
    // Add some empty files
    await writeFile('file.js', '')
    await writeFile('deeper/file.js', '')
    await writeFile('deeper/even/file.js', '')
    await writeFile('deeper/even/deeper/file.js', '')
    await writeFile('a/very/deep/file/path/file.js', '')

    const echoJSConfig = (echo) =>
      `module.exports = { '*.js': (files) => files.map((f) => \`echo ${echo} > \${f}\`) }`

    await writeFile('.lintstagedrc.js', echoJSConfig('level-0'))
    await writeFile('deeper/.lintstagedrc.js', echoJSConfig('level-1'))
    await writeFile('deeper/even/.lintstagedrc.cjs', echoJSConfig('level-2'))

    // Stage all files
    await execGit(['add', '.'])

    // Run lint-staged with `--shell` so that tasks do their thing
    // Run in 'deeper/' so that root config is ignored
    await gitCommit({ shell: true, cwd: path.join(cwd, 'deeper') })

    // 'file.js' was ignored
    expect(await readFile('file.js')).toMatch('')

    // 'deeper/file.js' matched 'deeper/.lintstagedrc.json'
    expect(await readFile('deeper/file.js')).toMatch('level-1')

    // 'deeper/even/file.js' matched 'deeper/even/.lintstagedrc.json'
    expect(await readFile('deeper/even/file.js')).toMatch('level-2')

    // 'deeper/even/deeper/file.js' matched from parent 'deeper/even/.lintstagedrc.json'
    expect(await readFile('deeper/even/deeper/file.js')).toMatch('level-2')

    // 'a/very/deep/file/path/file.js' was ignored
    expect(await readFile('a/very/deep/file/path/file.js')).toMatch('')
  })

  it('should not care about staged file outside current cwd with another staged file', async () => {
    await writeFile('file.js', testJsFileUgly)
    await writeFile('deeper/file.js', testJsFileUgly)
    await writeFile('deeper/.lintstagedrc.json', JSON.stringify(fixJsConfig.config))
    await execGit(['add', '.'])

    // Run lint-staged in "deeper/""
    expect(await gitCommit({ cwd: path.join(cwd, 'deeper') })).resolves

    // File inside deeper/ was fixed
    expect(await readFile('deeper/file.js')).toEqual(testJsFilePretty)
    // ...but file outside was not
    expect(await readFile('file.js')).toEqual(testJsFileUgly)
  })

  it('should not care about staged file outside current cwd without any other staged files', async () => {
    await writeFile('file.js', testJsFileUgly)
    await writeFile('deeper/.lintstagedrc.json', JSON.stringify(fixJsConfig.config))
    await execGit(['add', '.'])

    // Run lint-staged in "deeper/""
    expect(await gitCommit({ cwd: path.join(cwd, 'deeper') })).resolves

    expect(console.printHistory()).toMatch('No staged files match any configured task')

    // File outside deeper/ was not fixed
    expect(await readFile('file.js')).toEqual(testJsFileUgly)
  })
})

describe('lintStaged', () => {
  it('Should skip backup when run on an empty git repo without an initial commit', async () => {
    const globalConsoleTemp = console
    console = makeConsoleMock()
    const tmpDir = await createTempDir()
    const cwd = normalize(tmpDir)

    await execGit('init', { cwd })
    await execGit(['config', 'user.name', '"test"'], { cwd })
    await execGit(['config', 'user.email', '"test@test.com"'], { cwd })
    await appendFile('test.js', testJsFilePretty, cwd)
    await execGit(['add', 'test.js'], { cwd })

    await expect(execGit(['log', '-1'], { cwd })).rejects.toThrowError(
      'does not have any commits yet'
    )

    await gitCommit({
      config: { '*.js': 'prettier --list-different' },
      cwd,
      debut: true,
    })

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ⚠ Skipping backup because there’s no initial commit yet.

      LOG [STARTED] Preparing lint-staged...
      LOG [SUCCESS] Preparing lint-staged...
      LOG [STARTED] Running tasks for staged files...
      LOG [STARTED] Config object — 1 file
      LOG [STARTED] *.js — 1 file
      LOG [STARTED] prettier --list-different
      LOG [SUCCESS] prettier --list-different
      LOG [SUCCESS] *.js — 1 file
      LOG [SUCCESS] Config object — 1 file
      LOG [SUCCESS] Running tasks for staged files...
      LOG [STARTED] Applying modifications from tasks...
      LOG [SUCCESS] Applying modifications from tasks..."
    `)

    // Nothing is wrong, so the initial commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'], { cwd })).toEqual('1')
    expect(await execGit(['log', '-1', '--pretty=%B'], { cwd })).toMatch('test')
    expect(await readFile('test.js', cwd)).toEqual(testJsFilePretty)
    console = globalConsoleTemp
  })
})
