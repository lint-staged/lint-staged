import fs from 'fs-extra'
import { nanoid } from 'nanoid'
import normalize from 'normalize-path'
import os from 'os'
import path from 'path'

import execGitBase from '../lib/execGit'
import { writeFile } from '../lib/file'
import GitWorkflow from '../lib/gitWorkflow'
import { getInitialState } from '../lib/state'

jest.mock('../lib/file.js')
jest.unmock('execa')

jest.setTimeout(20000)

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
const removeTempDir = async (dirname) => {
  await fs.remove(dirname)
}

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

describe('gitWorkflow', () => {
  beforeEach(async () => {
    tmpDir = await createTempDir()
    cwd = normalize(tmpDir)
    await initGitRepo()
  })

  afterEach(async () => {
    if (!isAppveyor) {
      await removeTempDir(tmpDir)
    }
  })

  describe('prepare', () => {
    it('should handle errors', async () => {
      const gitWorkflow = new GitWorkflow({
        gitDir: cwd,
        gitConfigDir: path.resolve(cwd, './.git')
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
          "shouldBackup": null,
        }
      `)
    })
  })

  describe('cleanup', () => {
    it('should handle errors', async () => {
      const gitWorkflow = new GitWorkflow({
        gitDir: cwd,
        gitConfigDir: path.resolve(cwd, './.git')
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
          "shouldBackup": null,
        }
      `)
    })
  })

  describe('hideUnstagedChanges', () => {
    it('should handle errors', async () => {
      const gitWorkflow = new GitWorkflow({
        gitDir: cwd,
        gitConfigDir: path.resolve(cwd, './.git')
      })
      const totallyRandom = `totally_random_file-${Date.now().toString()}`
      gitWorkflow.partiallyStagedFiles = [totallyRandom]
      const ctx = getInitialState()
      await expect(gitWorkflow.hideUnstagedChanges(ctx)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"error: pathspec 'totally_random_file-1587728648348' did not match any file(s) known to git"`
      )
      expect(ctx).toMatchInlineSnapshot(`
        Object {
          "errors": Set {
            Symbol(GitError),
            Symbol(HideUnstagedChangesError),
          },
          "hasPartiallyStagedFiles": null,
          "output": Array [],
          "shouldBackup": null,
        }
      `)
    })
  })

  describe('restoreMergeStatus', () => {
    it('should handle error when restoring merge state fails', async () => {
      const gitWorkflow = new GitWorkflow({
        gitDir: cwd,
        gitConfigDir: path.resolve(cwd, './.git')
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
          "shouldBackup": null,
        }
      `)
    })
  })
})
