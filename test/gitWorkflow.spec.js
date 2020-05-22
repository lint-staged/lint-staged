import fs from 'fs-extra'
import normalize from 'normalize-path'
import path from 'path'

import execGitBase from '../lib/execGit'
import { writeFile } from '../lib/file'
import GitWorkflow from '../lib/gitWorkflow'
import { getInitialState } from '../lib/state'
import { createTempDir } from './utils/tempDir'

jest.mock('../lib/file.js')
jest.unmock('execa')

jest.setTimeout(20000)

let tmpDir, cwd

/** Append to file, creating if it doesn't exist */
const appendFile = async (filename, content, dir = cwd) =>
  fs.appendFile(path.resolve(dir, filename), content)

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
    tmpDir = await createTempDir()
    cwd = normalize(tmpDir)
    await initGitRepo()
  })

  afterEach(async () => {
    if (!isAppveyor) {
      await fs.remove(tmpDir)
    }
  })

  describe('prepare', () => {
    it('should handle errors', async () => {
      const gitWorkflow = new GitWorkflow({
        gitDir: cwd,
        gitConfigDir: path.resolve(cwd, './.git'),
      })
      jest.doMock('execa', () => Promise.reject({}))
      const ctx = getInitialState()
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
          "output": Array [],
          "quiet": false,
          "shouldBackup": null,
        }
      `)
    })
  })

  describe('cleanup', () => {
    it('should handle errors', async () => {
      const gitWorkflow = new GitWorkflow({
        gitDir: cwd,
        gitConfigDir: path.resolve(cwd, './.git'),
      })
      const ctx = getInitialState()
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
          "output": Array [],
          "quiet": false,
          "shouldBackup": null,
        }
      `)
    })
  })

  describe('hideUnstagedChanges', () => {
    it('should handle errors', async () => {
      const gitWorkflow = new GitWorkflow({
        gitDir: cwd,
        gitConfigDir: path.resolve(cwd, './.git'),
      })
      const totallyRandom = `totally_random_file-${Date.now().toString()}`
      gitWorkflow.partiallyStagedFiles = [totallyRandom]
      const ctx = getInitialState()
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
          "output": Array [],
          "quiet": false,
          "shouldBackup": null,
        }
      `)
    })
  })

  describe('restoreMergeStatus', () => {
    it('should handle error when restoring merge state fails', async () => {
      const gitWorkflow = new GitWorkflow({
        gitDir: cwd,
        gitConfigDir: path.resolve(cwd, './.git'),
      })
      gitWorkflow.mergeHeadBuffer = true
      writeFile.mockImplementation(() => Promise.reject('test'))
      const ctx = getInitialState()
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
          "output": Array [],
          "quiet": false,
          "shouldBackup": null,
        }
      `)
    })
  })
})
