import './__mocks__/resolveConfig.js'

import path from 'node:path'

import { jest as jestGlobals } from '@jest/globals'

import { writeFile } from '../../lib/file.js'
import { GitWorkflow } from '../../lib/gitWorkflow.js'
import { getInitialState } from '../../lib/state.js'

import { normalizeWindowsNewlines } from './__utils__/normalizeWindowsNewlines.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jestGlobals.mock('../../lib/file.js', () => {
  return {
    // notice `jestGlobals` vs `jest` here... this will be changed with `jest.unstable_mockModule`
    writeFile: jest.fn(() => Promise.resolve()),
  }
})

jestGlobals.setTimeout(20000)
jestGlobals.retryTimes(2)

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
          {
            "errors": Set {
              Symbol(GitError),
            },
            "events": EventEmitter {
              "_events": {},
              "_eventsCount": 0,
              "_maxListeners": undefined,
              Symbol(kCapture): false,
            },
            "hasPartiallyStagedFiles": true,
            "output": [],
            "quiet": false,
            "shouldBackup": null,
            "shouldHidePartiallyStaged": true,
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
          {
            "errors": Set {
              Symbol(GetBackupStashError),
              Symbol(GitError),
            },
            "events": EventEmitter {
              "_events": {},
              "_eventsCount": 0,
              "_maxListeners": undefined,
              Symbol(kCapture): false,
            },
            "hasPartiallyStagedFiles": null,
            "output": [],
            "quiet": false,
            "shouldBackup": null,
            "shouldHidePartiallyStaged": true,
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
          {
            "errors": Set {
              Symbol(GitError),
              Symbol(HideUnstagedChangesError),
            },
            "events": EventEmitter {
              "_events": {},
              "_eventsCount": 0,
              "_maxListeners": undefined,
              Symbol(kCapture): false,
            },
            "hasPartiallyStagedFiles": null,
            "output": [],
            "quiet": false,
            "shouldBackup": null,
            "shouldHidePartiallyStaged": true,
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
          {
            "errors": Set {
              Symbol(GitError),
              Symbol(RestoreMergeStatusError),
            },
            "events": EventEmitter {
              "_events": {},
              "_eventsCount": 0,
              "_maxListeners": undefined,
              Symbol(kCapture): false,
            },
            "hasPartiallyStagedFiles": null,
            "output": [],
            "quiet": false,
            "shouldBackup": null,
            "shouldHidePartiallyStaged": true,
          }
        `)
      })
    )
  })
})
