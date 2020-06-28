import fs from 'fs-extra'
import normalize from 'normalize-path'
import path from 'path'
import makeConsoleMock from 'consolemock'

import execGitBase from '../lib/execGit'
import { writeFile } from '../lib/file'
import GitWorkflow from '../lib/gitWorkflow'
import { getInitialState } from '../lib/state'
import { createTempDir } from './utils/tempDir'
import { GitError, RestoreOriginalStateError } from '../lib/symbols'

jest.mock('../lib/file.js')
jest.unmock('execa')

jest.setTimeout(20000)

let tmpDir, cwd

/** Append to file, creating if it doesn't exist */
const appendFile = async (filename, content, dir = cwd) =>
  fs.appendFile(path.resolve(dir, filename), content)

const readFile = async (filename, dir = cwd) => fs.readFile(path.resolve(dir, filename))

/** Wrap execGit to always pass `gitOps` */
const execGit = async (args) => execGitBase(args, { cwd })

/** Initialize git repo for test */
const initGitRepo = async () => {
  await execGit('init')
  await execGit(['config', 'user.name', '"test"'])
  await execGit(['config', 'user.email', '"test@test.com"'])
  await appendFile('README.md', '# Test\n')
  await execGit(['add', 'README.md'])
  await execGit(['commit', '-m initial commit'])
}

const isAppveyor = !!process.env.APPVEYOR

describe('gitWorkflow', () => {
  beforeEach(async () => {
    console = makeConsoleMock()
    tmpDir = await createTempDir()
    cwd = normalize(tmpDir)
    await initGitRepo()
  })

  afterEach(async () => {
    console.clearHistory()
    if (!isAppveyor) {
      await fs.remove(tmpDir)
    }
  })

  describe('prepare', () => {
    it('should handle errors', async () => {
      const gitWorkflow = new GitWorkflow({ cwd }, console)
      const ctx = getInitialState()
      await gitWorkflow.init(ctx)
      jest.doMock('execa', () => Promise.reject({}))

      // mock a simple failure
      gitWorkflow.getPartiallyStagedFiles = () => ['foo']
      gitWorkflow.getHiddenFilepath = () => {
        throw new Error('test')
      }
      await expect(gitWorkflow.prepare(ctx, false)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"test"`
      )
      expect(ctx).toMatchInlineSnapshot(`
        Object {
          "errors": Set {
            Symbol(GitError),
          },
          "hasPartiallyStagedFiles": true,
          "matchedFileChunks": Array [],
          "output": Array [],
          "quiet": false,
          "shouldBackup": null,
        }
      `)
    })
  })

  describe('cleanup', () => {
    it('should handle errors', async () => {
      const gitWorkflow = new GitWorkflow({ cwd }, console)
      const ctx = getInitialState()
      await gitWorkflow.init(ctx)
      jest.doMock('execa', () => Promise.reject({}))

      await expect(gitWorkflow.cleanup(ctx)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"lint-staged automatic backup is missing!"`
      )
      expect(ctx).toMatchInlineSnapshot(`
        Object {
          "errors": Set {
            Symbol(GetBackupStashError),
            Symbol(GitError),
          },
          "hasPartiallyStagedFiles": null,
          "matchedFileChunks": Array [],
          "output": Array [],
          "quiet": false,
          "shouldBackup": null,
        }
      `)
    })
  })

  describe('getPartiallyStagedFiles', () => {
    it('should return unquoted files', async () => {
      await appendFile('file with spaces.txt', 'staged content')
      await appendFile('file_without_spaces.txt', 'staged content')
      await execGit(['add', 'file with spaces.txt'])
      await execGit(['add', 'file_without_spaces.txt'])
      await appendFile('file with spaces.txt', 'not staged content')
      await appendFile('file_without_spaces.txt', 'not staged content')

      const gitWorkflow = new GitWorkflow({ cwd }, console)
      const ctx = getInitialState()
      await gitWorkflow.init(ctx)

      expect(await gitWorkflow.getPartiallyStagedFiles()).toStrictEqual([
        'file with spaces.txt',
        'file_without_spaces.txt',
      ])
    })
    it('should include to and from for renamed files', async () => {
      await appendFile('original.txt', 'test content')
      await execGit(['add', 'original.txt'])
      await execGit(['commit', '-m "Add original.txt"'])
      await appendFile('original.txt', 'additional content')
      await execGit(['mv', 'original.txt', 'renamed.txt'])

      const gitWorkflow = new GitWorkflow({ cwd }, console)
      const ctx = getInitialState()
      await gitWorkflow.init(ctx)

      expect(await gitWorkflow.getPartiallyStagedFiles()).toStrictEqual([
        'renamed.txt\u0000original.txt',
      ])
    })
  })

  describe('hideUnstagedChanges', () => {
    it('should handle errors', async () => {
      const gitWorkflow = new GitWorkflow({ cwd }, console)
      const ctx = getInitialState()
      await gitWorkflow.init(ctx)
      const totallyRandom = `totally_random_file-${Date.now().toString()}`
      gitWorkflow.partiallyStagedFiles = [totallyRandom]
      await expect(gitWorkflow.hideUnstagedChanges(ctx)).rejects.toThrowError(
        `pathspec '${totallyRandom}' did not match any file(s) known to git`
      )
      expect(ctx).toMatchInlineSnapshot(`
        Object {
          "errors": Set {
            Symbol(GitError),
            Symbol(HideUnstagedChangesError),
          },
          "hasPartiallyStagedFiles": null,
          "matchedFileChunks": Array [],
          "output": Array [],
          "quiet": false,
          "shouldBackup": null,
        }
      `)
    })
    it('should checkout renamed file when hiding changes', async () => {
      const gitWorkflow = new GitWorkflow({ cwd }, console)
      const ctx = getInitialState()
      await gitWorkflow.init(ctx)
      const origContent = await readFile('README.md')
      await execGit(['mv', 'README.md', 'TEST.md'])
      await appendFile('TEST.md', 'added content')

      gitWorkflow.partiallyStagedFiles = await gitWorkflow.getPartiallyStagedFiles()

      await gitWorkflow.hideUnstagedChanges(ctx)
      expect(await readFile('TEST.md')).toStrictEqual(origContent)
    })
  })

  describe('restoreMergeStatus', () => {
    it('should handle error when restoring merge state fails', async () => {
      const gitWorkflow = new GitWorkflow({ cwd }, console)
      const ctx = getInitialState()
      await gitWorkflow.init(ctx)
      gitWorkflow.mergeHeadBuffer = true
      writeFile.mockImplementation(() => Promise.reject('test'))
      await expect(gitWorkflow.restoreMergeStatus(ctx)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Merge state could not be restored due to an error!"`
      )
      expect(ctx).toMatchInlineSnapshot(`
        Object {
          "errors": Set {
            Symbol(GitError),
            Symbol(RestoreMergeStatusError),
          },
          "hasPartiallyStagedFiles": null,
          "matchedFileChunks": Array [],
          "output": Array [],
          "quiet": false,
          "shouldBackup": null,
        }
      `)
    })
  })

  describe('applyModificationsSkipped', () => {
    it('should return false when backup is disabled', () => {
      const gitWorkflow = new GitWorkflow({ cwd }, console)

      const result = gitWorkflow.applyModificationsSkipped({ shouldBackup: false })
      expect(result).toEqual(false)
    })

    it('should return error message when there is an unkown git error', () => {
      const gitWorkflow = new GitWorkflow({ cwd }, console)

      const result = gitWorkflow.applyModificationsSkipped({
        shouldBackup: true,
        errors: new Set([GitError]),
      })
      expect(typeof result === 'string').toEqual(true)
    })
  })

  describe('restoreUnstagedChangesSkipped', () => {
    it('should return error message when there is an unkown git error', () => {
      const gitWorkflow = new GitWorkflow({ cwd }, console)

      const result = gitWorkflow.restoreUnstagedChangesSkipped({ errors: new Set([GitError]) })
      expect(typeof result === 'string').toEqual(true)
    })
  })

  describe('restoreOriginalStateSkipped', () => {
    it('should return error message when there is an unkown git error', () => {
      const gitWorkflow = new GitWorkflow({ cwd }, console)

      const result = gitWorkflow.restoreOriginalStateSkipped({ errors: new Set([GitError]) })
      expect(typeof result === 'string').toEqual(true)
    })
  })

  describe('shouldSkipCleanup', () => {
    it('should return error message when reverting to original state fails', () => {
      const gitWorkflow = new GitWorkflow({ cwd }, console)

      const result = gitWorkflow.cleanupSkipped({ errors: new Set([RestoreOriginalStateError]) })
      expect(typeof result === 'string').toEqual(true)
    })
  })

  describe('init', () => {
    it('should init git directories', async () => {
      const gitWorkflow = new GitWorkflow({ cwd, stash: true }, console)

      const ctx = getInitialState()

      const result = await gitWorkflow.init(ctx)

      expect(result).toEqual({ baseDir: cwd, shouldBackup: true })
    })

    it('should not backup if stash option is false', async () => {
      const gitWorkflow = new GitWorkflow({ cwd, stash: false }, console)

      const ctx = getInitialState()

      const result = await gitWorkflow.init(ctx)

      expect(result).toEqual({ baseDir: cwd, shouldBackup: false })
    })

    it('should fail with unknown dir', async () => {
      const gitWorkflow = new GitWorkflow({ cwd: './fake-dir', stash: false }, console)

      const ctx = getInitialState()

      await expect(gitWorkflow.init(ctx)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"lint-staged failed"`
      )
    })
  })

  describe('finalize', () => {
    it('should add common git error on finalize stage', async () => {
      const gitWorkflow = new GitWorkflow({ cwd, stash: true }, console)

      const ctx = getInitialState()
      ctx.errors.add(GitError)

      await gitWorkflow.finalize(ctx)

      expect(console.printHistory()).toMatchInlineSnapshot(`
        "
        ERROR 
          × lint-staged failed due to a git error."
      `)
    })
  })
})
