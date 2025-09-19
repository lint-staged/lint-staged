import path from 'node:path'

import { describe, it, vi } from 'vitest'

import { writeFile } from '../../lib/file.js'
import { GitWorkflow } from '../../lib/gitWorkflow.js'
import { getInitialState } from '../../lib/state.js'
import {
  GetBackupStashError,
  GitError,
  HideUnstagedChangesError,
  RestoreMergeStatusError,
} from '../../lib/symbols.js'
import { normalizeWindowsNewlines } from './__utils__/normalizeWindowsNewlines.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

vi.mock('../../lib/file.js', () => ({
  writeFile: vi.fn(() => Promise.resolve()),
}))

describe('gitWorkflow', () => {
  describe('prepare', () => {
    it(
      'should handle errors',
      withGitIntegration(async ({ cwd, expect }) => {
        const gitWorkflow = new GitWorkflow({
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })

        vi.doMock('execa', () => Promise.reject({}))
        const ctx = getInitialState()
        // mock a simple failure
        gitWorkflow.getUnstagedFiles = () => ['foo']
        gitWorkflow.getHiddenFilepath = () => {
          throw new Error('test')
        }
        await expect(gitWorkflow.prepare(ctx, false)).rejects.toThrow('test')

        expect(ctx.errors).toBeInstanceOf(Set)
        expect(ctx.errors.has(GitError)).toBe(true)
      })
    )
  })

  describe('cleanup', () => {
    it(
      'should handle errors',
      withGitIntegration(async ({ cwd, expect }) => {
        const gitWorkflow = new GitWorkflow({
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })

        const ctx = getInitialState()
        await expect(gitWorkflow.cleanup(ctx)).rejects.toThrow(
          'lint-staged automatic backup is missing!'
        )

        expect(ctx.errors).toBeInstanceOf(Set)
        expect(ctx.errors.has(GetBackupStashError)).toBe(true)
        expect(ctx.errors.has(GitError)).toBe(true)
      })
    )
  })

  describe('getUnstagedFiles', () => {
    it(
      'should return null when no unstaged changes',
      withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
        const gitWorkflow = new GitWorkflow({
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })
        await appendFile('file with spaces.txt', 'staged content')
        await appendFile('file_without_spaces.txt', 'staged content')
        await execGit(['add', 'file with spaces.txt'])
        await execGit(['add', 'file_without_spaces.txt'])

        expect(await gitWorkflow.getUnstagedFiles({ onlyPartial: false })).toStrictEqual(null)
      })
    )

    it(
      'should return unquoted files',
      withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
        const gitWorkflow = new GitWorkflow({
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })
        await appendFile('file with spaces.txt', 'staged content')
        await appendFile('file_without_spaces.txt', 'staged content')
        await execGit(['add', 'file with spaces.txt'])
        await execGit(['add', 'file_without_spaces.txt'])
        await appendFile('file with spaces.txt', 'not staged content')
        await appendFile('file_without_spaces.txt', 'not staged content')

        expect(await gitWorkflow.getUnstagedFiles({ onlyPartial: false })).toStrictEqual([
          'file with spaces.txt',
          'file_without_spaces.txt',
        ])
      })
    )

    it(
      'should return only partially changes files',
      withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
        const gitWorkflow = new GitWorkflow({
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })
        await appendFile('file with spaces.txt', 'staged content')
        await appendFile('file_without_spaces.txt', 'staged content')
        await execGit(['add', 'file with spaces.txt'])
        await appendFile('file with spaces.txt', 'not staged content')
        await appendFile('file_without_spaces.txt', 'not staged content')

        expect(await gitWorkflow.getUnstagedFiles({ onlyPartial: true })).toStrictEqual([
          'file with spaces.txt',
        ])
      })
    )

    it(
      'should include to and from for renamed files',
      withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
        const gitWorkflow = new GitWorkflow({
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })

        await appendFile('original.txt', 'test content')
        await execGit(['add', 'original.txt'])
        await execGit(['commit', '-m "Add original.txt"'])
        await appendFile('original.txt', 'additional content')
        await execGit(['mv', 'original.txt', 'renamed.txt'])

        expect(await gitWorkflow.getUnstagedFiles()).toStrictEqual([
          'renamed.txt\u0000original.txt',
        ])
      })
    )
  })

  describe('hideUnstagedChanges', () => {
    it(
      'should handle errors',
      withGitIntegration(async ({ cwd, expect }) => {
        const gitWorkflow = new GitWorkflow({
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })

        const totallyRandom = `totally_random_file-${Date.now().toString()}`
        gitWorkflow.unstagedFiles = [totallyRandom]
        const ctx = getInitialState()
        await expect(gitWorkflow.hideUnstagedChanges(ctx)).rejects.toThrow(
          `pathspec '${totallyRandom}' did not match any file(s) known to git`
        )

        expect(ctx.errors).toBeInstanceOf(Set)
        expect(ctx.errors.has(HideUnstagedChangesError)).toBe(true)
        expect(ctx.errors.has(GitError)).toBe(true)
      })
    )

    it(
      'should checkout renamed file when hiding changes',
      withGitIntegration(async ({ appendFile, cwd, execGit, expect, readFile }) => {
        const gitWorkflow = new GitWorkflow({
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })

        const origContent = await readFile('README.md')
        await execGit(['mv', 'README.md', 'TEST.md'])
        await appendFile('TEST.md', 'added content')

        gitWorkflow.unstagedFiles = await gitWorkflow.getUnstagedFiles(true)
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
      withGitIntegration(async ({ cwd, expect }) => {
        const gitWorkflow = new GitWorkflow({
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })

        gitWorkflow.mergeHeadBuffer = true
        writeFile.mockImplementation(() => Promise.reject('test'))
        const ctx = getInitialState()
        await expect(gitWorkflow.restoreMergeStatus(ctx)).rejects.toThrow(
          'Merge state could not be restored due to an error!'
        )

        expect(ctx.errors).toBeInstanceOf(Set)
        expect(ctx.errors.has(GitError)).toBe(true)
        expect(ctx.errors.has(RestoreMergeStatusError)).toBe(true)
      })
    )
  })
})
