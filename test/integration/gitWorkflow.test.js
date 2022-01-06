import path from 'path'

import { writeFile } from '../../lib/file'
import { GitWorkflow } from '../../lib/gitWorkflow'
import { getInitialState } from '../../lib/state'

import { normalizeWindowsNewlines } from './utils/windowsNewLines'
import { itWithGitIntegration } from './utils/gitIntegration'

jest.mock('../../lib/file.js')
jest.unmock('execa')

jest.mock('../../lib/resolveConfig', () => ({
  /** Unfortunately necessary due to non-ESM tests. */
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))

jest.setTimeout(20000)

describe('gitWorkflow', () => {
  describe('prepare', () => {
    itWithGitIntegration('should handle errors', async ({ cwd }) => {
      const gitWorkflow = new GitWorkflow({ gitDir: cwd, gitConfigDir: path.join(cwd, './.git') })

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
    itWithGitIntegration('should handle errors', async ({ cwd }) => {
      const gitWorkflow = new GitWorkflow({ gitDir: cwd, gitConfigDir: path.join(cwd, './.git') })

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

  describe('getPartiallyStagedFiles', () => {
    itWithGitIntegration('should return unquoted files', async ({ appendFile, cwd, execGit }) => {
      const gitWorkflow = new GitWorkflow({
        gitDir: cwd,
        gitConfigDir: path.join(cwd, './.git'),
      })
      await appendFile('file with spaces.txt', 'staged content')
      await appendFile('file_without_spaces.txt', 'staged content')
      await execGit(['add', 'file with spaces.txt'])
      await execGit(['add', 'file_without_spaces.txt'])
      await appendFile('file with spaces.txt', 'not staged content')
      await appendFile('file_without_spaces.txt', 'not staged content')

      expect(await gitWorkflow.getPartiallyStagedFiles()).toStrictEqual([
        'file with spaces.txt',
        'file_without_spaces.txt',
      ])
    })

    itWithGitIntegration(
      'should include to and from for renamed files',
      async ({ appendFile, cwd, execGit }) => {
        const gitWorkflow = new GitWorkflow({ gitDir: cwd, gitConfigDir: path.join(cwd, './.git') })

        await appendFile('original.txt', 'test content')
        await execGit(['add', 'original.txt'])
        await execGit(['commit', '-m "Add original.txt"'])
        await appendFile('original.txt', 'additional content')
        await execGit(['mv', 'original.txt', 'renamed.txt'])

        expect(await gitWorkflow.getPartiallyStagedFiles()).toStrictEqual([
          'renamed.txt\u0000original.txt',
        ])
      }
    )
  })

  describe('hideUnstagedChanges', () => {
    itWithGitIntegration('should handle errors', async ({ cwd }) => {
      const gitWorkflow = new GitWorkflow({ gitDir: cwd, gitConfigDir: path.join(cwd, './.git') })

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

    itWithGitIntegration(
      'should checkout renamed file when hiding changes',
      async ({ appendFile, cwd, execGit, readFile }) => {
        const gitWorkflow = new GitWorkflow({ gitDir: cwd, gitConfigDir: path.join(cwd, './.git') })

        const origContent = await readFile('README.md')
        await execGit(['mv', 'README.md', 'TEST.md'])
        await appendFile('TEST.md', 'added content')

        gitWorkflow.partiallyStagedFiles = await gitWorkflow.getPartiallyStagedFiles()
        const ctx = getInitialState()
        await gitWorkflow.hideUnstagedChanges(ctx)

        /** @todo `git mv` in GitHub Windows runners seem to add `\r\n` newlines in this case. */
        expect(normalizeWindowsNewlines(await readFile('TEST.md'))).toStrictEqual(origContent)
      }
    )
  })

  describe('restoreMergeStatus', () => {
    itWithGitIntegration(
      'should handle error when restoring merge state fails',
      async ({ cwd }) => {
        const gitWorkflow = new GitWorkflow({ gitDir: cwd, gitConfigDir: path.join(cwd, './.git') })

        gitWorkflow.mergeHeadBuffer = true
        writeFile.mockImplementation(() => Promise.reject('test'))
        const ctx = getInitialState()
        await expect(
          gitWorkflow.restoreMergeStatus(ctx)
        ).rejects.toThrowErrorMatchingInlineSnapshot(
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
      }
    )
  })
})
