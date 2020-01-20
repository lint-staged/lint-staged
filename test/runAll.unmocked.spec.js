import fs from 'fs-extra'
import makeConsoleMock from 'consolemock'
import normalize from 'normalize-path'
import os from 'os'
import path from 'path'
import nanoid from 'nanoid'

import execGitBase from '../lib/execGit'
import runAll from '../lib/runAll'

jest.unmock('execa')

jest.setTimeout(20000)

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

const fixJsConfig = { config: { '*.js': 'prettier --write' } }

const isAppveyor = !!process.env.APPVEYOR
const osTmpDir = isAppveyor ? 'C:\\projects' : fs.realpathSync(os.tmpdir())

/**
 * Create temporary directory and return its path
 * @returns {Promise<String>}
 */
const createTempDir = async () => {
  const dirname = path.resolve(osTmpDir, 'lint-staged-test', nanoid())
  await fs.ensureDir(dirname)
  return dirname
}

/**
 * Remove temporary directory
 * @param {String} dirname
 * @returns {Promise<Void>}
 */
const removeTempDir = async dirname => {
  await fs.remove(dirname)
}

let tmpDir
let cwd

// Get file content
const readFile = async (filename, dir = cwd) =>
  fs.readFile(path.resolve(dir, filename), { encoding: 'utf-8' })

// Append to file, creating if it doesn't exist
const appendFile = async (filename, content, dir = cwd) =>
  fs.appendFile(path.resolve(dir, filename), content)

// Write (over) file, creating if it doesn't exist
const writeFile = async (filename, content, dir = cwd) =>
  fs.writeFile(path.resolve(dir, filename), content)

// Wrap execGit to always pass `gitOps`
const execGit = async (args, options = {}) => execGitBase(args, { cwd, ...options })

// Execute runAll before git commit to emulate lint-staged
const gitCommit = async (options, args = ['-m test']) => {
  await runAll({ quiet: true, ...options, cwd })
  await execGit(['commit', ...args])
}

describe('runAll', () => {
  it('should throw when not in a git directory', async () => {
    const nonGitDir = await createTempDir()
    await expect(runAll({ cwd: nonGitDir })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Current directory is not a git directory!"`
    )
    await removeTempDir(nonGitDir)
  })

  it('should short-circuit with no staged files', async () => {
    const status = await runAll({ config: { '*.js': 'echo success' }, cwd })
    expect(status).toEqual('No tasks to run.')
  })
})

const globalConsoleTemp = console

describe('runAll', () => {
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
    await appendFile('README.md', '# Test\n')
    await execGit(['add', 'README.md'])
    await execGit(['commit', '-m initial commit'])
  })

  afterEach(async () => {
    console.clearHistory()
    if (!isAppveyor) {
      await removeTempDir(tmpDir)
    }
  })

  afterAll(() => {
    console = globalConsoleTemp
  })

  it('Should commit entire staged file when no errors from linter', async () => {
    // Stage pretty file
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await gitCommit({ config: { '*.js': 'prettier --list-different' } })

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
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
      expect(error.message).toMatchInlineSnapshot(`"Something went wrong"`)
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
      expect(error.message).toMatchInlineSnapshot(`"Something went wrong"`)
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
          }
        },
        quiet: false,
        debug: true
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
    const appended = '\nconsole.log("test");\n'
    await appendFile('test.js', appended)

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await gitCommit({ config: { '*.js': 'prettier --list-different' } })

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
    await gitCommit(fixJsConfig)

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
    try {
      await gitCommit({ config: { '*.js': 'prettier --list-different' } })
    } catch (error) {
      expect(error.message).toMatchInlineSnapshot(`"Something went wrong"`)
    }

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
      expect(error.message).toMatchInlineSnapshot(`"Something went wrong"`)
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
    // The task creates a git lock file and runs `git add` to simulate failure
    await expect(
      gitCommit({
        config: {
          '*.js': files => [
            `touch ${cwd}/.git/index.lock`,
            `prettier --write ${files.join(' ')}`,
            `git add ${files.join(' ')}`
          ]
        }
      })
    ).rejects.toThrowError()
    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      WARN ‼ Some of your tasks use \`git add\` command. Please remove it from the config since all modifications made by tasks will be automatically added to the git commit index.

      ERROR 
        × lint-staged failed due to a git error.
          Any lost modifications can be restored from a git stash:

          > git stash list
          stash@{0}: On master: automatic lint-staged backup
          > git stash pop stash@{0}
      "
    `)

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
    await gitCommit(fixJsConfig, ['-m commit a'])
    expect(await readFile('test.js')).toEqual(fileInBranchA)

    await execGit(['checkout', 'master'])

    // Create another branch
    await execGit(['checkout', '-b', 'branch-b'])
    await appendFile('test.js', fileInBranchB)
    await execGit(['add', '.'])
    await gitCommit(fixJsConfig, ['-m commit b'])
    expect(await readFile('test.js')).toEqual(fileInBranchBFixed)

    // Merge first branch
    await execGit(['checkout', 'master'])
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

    await execGit(['checkout', 'master'])

    // Create another branch
    await execGit(['checkout', '-b', 'branch-b'])
    await appendFile('test.js', fileInBranchB)
    await execGit(['add', '.'])
    await gitCommit(fixJsConfig, ['-m commit b'])
    expect(await readFile('test.js')).toEqual(fileInBranchBFixed)

    // Merge first branch
    await execGit(['checkout', 'master'])
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
    await expect(
      runAll({ config: { '*.js': 'prettier --list-different' }, cwd, quiet: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Something went wrong"`)

    // Something went wrong, so runAll failed and merge is still going
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['status'])).toMatch('All conflicts fixed but you are still merging')
    expect(await readFile('test.js')).toEqual(fileInBranchB)
  })

  it('should keep untracked files', async () => {
    // Stage pretty file
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])

    // Add another file, but keep it untracked
    await appendFile('test-untracked.js', testJsFilePretty)

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await gitCommit({ config: { '*.js': 'prettier --list-different' } })

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
    expect(await readFile('test-untracked.js')).toEqual(testJsFilePretty)
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
      '--no-edit'
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

  it('should not resurrect removed files due to git bug', async () => {
    const readmeFile = path.resolve(cwd, 'README.md')
    await fs.remove(readmeFile) // Remove file from previous commit
    await execGit(['add', '.'])
    await gitCommit({ config: { '*.{js,md}': 'prettier --list-different' } })
    const exists = await fs.exists(readmeFile)
    expect(exists).toEqual(false)
  })

  it('should handle binary files', async () => {
    // mark test.js as binary file
    await appendFile('.gitattributes', 'test.js binary\n')

    // Stage pretty file
    await appendFile('test.js', testJsFilePretty)
    await execGit(['add', 'test.js'])

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await gitCommit({ config: { '*.js': 'prettier --list-different' } })

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
    expect(await readFile('test.js')).toEqual(testJsFilePretty)
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
      gitCommit({
        config: { '*.js': () => 'git stash drop' },
        shell: true,
        debug: true,
        quiet: false
      })
    ).rejects.toThrowError()

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG Preparing... [started]
      LOG Preparing... [completed]
      LOG Running tasks... [started]
      LOG Running tasks for *.js [started]
      LOG git stash drop [started]
      LOG git stash drop [completed]
      LOG Running tasks for *.js [completed]
      LOG Running tasks... [completed]
      LOG Applying modifications... [started]
      LOG Applying modifications... [completed]
      LOG Cleaning up... [started]
      LOG Cleaning up... [failed]
      LOG → lint-staged automatic backup is missing!"
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
    await expect(
      gitCommit({ config: { '*.js': 'prettier --write' } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Something went wrong"`)

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      WARN 
        ‼ lint-staged prevented an empty git commit.
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
      '--allow-empty'
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

    // Stage pretty file
    await appendFile('test.js', testJsFilePretty, submoduleDir)
    await execGit(['add', 'test.js'], { cwd: submoduleDir })

    // Run lint-staged with `prettier --list-different` and commit pretty file
    await runAll({
      config: { '*.js': 'prettier --list-different' },
      cwd: submoduleDir,
      quiet: true
    })
    await execGit(['commit', '-m test'], { cwd: submoduleDir })

    // Nothing is wrong, so a new commit is created
    expect(await execGit(['rev-list', '--count', 'HEAD'], { cwd: submoduleDir })).toEqual('2')
    expect(await execGit(['log', '-1', '--pretty=%B'], { cwd: submoduleDir })).toMatch('test')
    expect(await readFile('test.js', submoduleDir)).toEqual(testJsFilePretty)
  })
})
