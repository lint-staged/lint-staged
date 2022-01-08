import path from 'path'

import { jest } from '@jest/globals'

import { GitWorkflow } from '../lib/gitWorkflow.js'
import { getInitialState } from '../lib/state.js'

import { normalizeWindowsNewlines } from './utils/windowsNewLines.js'
import { withGitIntegration } from './utils/gitIntegration.js'

jest.unstable_mockModule('../lib/file.js', () => ({ writeFile: jest.fn(() => Promise.resolve()) }))
const { writeFile } = await import('../lib/file.js')

jest.setTimeout(20000)
jest.retryTimes(2)

describe('gitWorkflow', () => {
  describe('prepare', () => {
    it(
      'should handle errors',
      withGitIntegration(async ({ cwd }) => {
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
    )
  })

  describe('cleanup', () => {
    it(
      'should handle errors',
      withGitIntegration(async ({ cwd }) => {
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
    )
  })

  describe('getPartiallyStagedFiles', () => {
    it(
      'should return unquoted files',
      withGitIntegration(async ({ appendFile, cwd, execGit }) => {
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
    )

    it(
      'should include to and from for renamed files',
      withGitIntegration(async ({ appendFile, cwd, execGit }) => {
        const gitWorkflow = new GitWorkflow({ gitDir: cwd, gitConfigDir: path.join(cwd, './.git') })

        await appendFile('original.txt', 'test content')
        await execGit(['add', 'original.txt'])
        await execGit(['commit', '-m "Add original.txt"'])
        await appendFile('original.txt', 'additional content')
        await execGit(['mv', 'original.txt', 'renamed.txt'])

        expect(await gitWorkflow.getPartiallyStagedFiles()).toStrictEqual([
          'renamed.txt\u0000original.txt',
        ])
      })
    )
  })

  describe('hideUnstagedChanges', () => {
    it(
      'should handle errors',
      withGitIntegration(async ({ cwd }) => {
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
    )

    it(
      'should checkout renamed file when hiding changes',
      withGitIntegration(async ({ appendFile, cwd, execGit, readFile }) => {
        const gitWorkflow = new GitWorkflow({ gitDir: cwd, gitConfigDir: path.join(cwd, './.git') })

        const origContent = await readFile('README.md')
        await execGit(['mv', 'README.md', 'TEST.md'])
        await appendFile('TEST.md', 'added content')

        gitWorkflow.partiallyStagedFiles = await gitWorkflow.getPartiallyStagedFiles()
        const ctx = getInitialState()
        await gitWorkflow.hideUnstagedChanges(ctx)

        /** @todo `git mv` in GitHub Windows runners seem to add `\r\n` newlines in this case. */
        expect(normalizeWindowsNewlines(await readFile('TEST.md'))).toStrictEqual(origContent)
      })
    )
  })

  describe('restoreMergeStatus', () => {
    it(
      'should handle error when restoring merge state fails',
      withGitIntegration(async ({ cwd }) => {
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
      })
    )
  })
})
