import path from 'node:path'

import makeConsoleMock from 'consolemock'
import { describe, it, vi } from 'vitest'

import { writeFile } from '../../lib/file.js'
import { GitWorkflow } from '../../lib/gitWorkflow.js'
import { normalizePath } from '../../lib/normalizePath.js'
import { getInitialState } from '../../lib/state.js'
import {
  ApplyEmptyCommitError,
  GitError,
  HideUnstagedChangesError,
  RestoreMergeStatusError,
  RestoreUnstagedChangesError,
} from '../../lib/symbols.js'
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
          logger: makeConsoleMock(),
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })

        vi.doMock('tinyexec', () => Promise.reject({}))
        const ctx = getInitialState()
        // mock a simple failure
        gitWorkflow.getUnstagedFiles = () => ['foo']
        gitWorkflow.getHiddenFilepath = () => {
          throw new Error('test')
        }

        await gitWorkflow.prepare(ctx)

        expect(ctx.errors).toBeInstanceOf(Set)
        expect(ctx.errors.has(GitError)).toBe(true)
      })
    )

    it(
      'should handle errors when should backup',
      withGitIntegration(async ({ cwd, expect }) => {
        const gitWorkflow = new GitWorkflow({
          logger: makeConsoleMock(),
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })

        vi.doMock('tinyexec', () => Promise.reject({}))
        const ctx = getInitialState()
        ctx.shouldBackup = true
        // mock a simple failure
        gitWorkflow.getUnstagedFiles = () => ['foo']
        gitWorkflow.getHiddenFilepath = () => {
          throw new Error('test')
        }

        await gitWorkflow.prepare(ctx)

        expect(ctx.errors).toBeInstanceOf(Set)
        expect(ctx.errors.has(GitError)).toBe(true)
      })
    )
  })

  describe('getUnstagedFiles', () => {
    it(
      'should return null when no unstaged changes',
      withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
        const gitWorkflow = new GitWorkflow({
          logger: makeConsoleMock(),
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
          logger: makeConsoleMock(),
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
          logger: makeConsoleMock(),
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
          logger: makeConsoleMock(),
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

  describe('hidePartiallyStagedChanges', () => {
    it(
      'should handle errors',
      withGitIntegration(async ({ cwd, expect }) => {
        const gitWorkflow = new GitWorkflow({
          logger: makeConsoleMock(),
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })

        const totallyRandom = `totally_random_file-${Date.now().toString()}`
        gitWorkflow.unstagedFiles = [totallyRandom]
        const ctx = getInitialState()

        await gitWorkflow.hidePartiallyStagedChanges(ctx)

        expect(ctx.errors).toBeInstanceOf(Set)
        expect(ctx.errors.has(HideUnstagedChangesError)).toBe(true)
        expect(ctx.errors.has(GitError)).toBe(true)
      })
    )

    it(
      'should checkout renamed file when hiding changes',
      withGitIntegration(async ({ appendFile, cwd, execGit, expect, readFile }) => {
        const logger = makeConsoleMock()

        const gitWorkflow = new GitWorkflow({
          logger,
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })

        const origContent = await readFile('README.md')
        await execGit(['mv', 'README.md', 'TEST.md'])
        await appendFile('TEST.md', 'added content')

        gitWorkflow.unstagedFiles = await gitWorkflow.getUnstagedFiles(true)
        const ctx = getInitialState()

        await gitWorkflow.hidePartiallyStagedChanges(ctx)

        expect(await readFile('TEST.md')).toStrictEqual(origContent)
      })
    )
  })

  describe('runTasks', () => {
    it(
      'should handle errors for staged files',
      withGitIntegration(async ({ cwd, expect }) => {
        const logger = makeConsoleMock()
        const gitWorkflow = new GitWorkflow({
          logger,
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })
        const error = new Error('test')
        const tasks = [
          {
            skip: () => {
              throw error
            },
          },
        ]

        await gitWorkflow.runTasks(getInitialState(), tasks, {
          abortController: new AbortController(),
          concurrent: true,
        })

        expect(logger.printHistory()).toMatch('Failed to run tasks for staged files')
      })
    )

    it(
      'should handle errors for changed files',
      withGitIntegration(async ({ cwd, expect }) => {
        const logger = makeConsoleMock()
        const gitWorkflow = new GitWorkflow({
          diff: 'HEAD..main',
          logger,
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })
        const error = new Error('test')
        const tasks = [
          {
            skip: () => {
              throw error
            },
          },
        ]

        await gitWorkflow.runTasks(getInitialState(), tasks, {
          abortController: new AbortController(),
          concurrent: true,
        })

        expect(logger.printHistory()).toMatch('Failed to run tasks for changed files')
      })
    )

    it(
      'should handle errors when calculating hash of unstaged changes',
      withGitIntegration(async ({ cwd, expect }) => {
        const logger = makeConsoleMock()
        const gitWorkflow = new GitWorkflow({
          logger,
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })
        gitWorkflow.execGit = vi.fn().mockRejectedValue(new Error('test'))
        const ctx = getInitialState({ failOnChanges: true })

        await gitWorkflow.runTasks(ctx, [], {
          abortController: new AbortController(),
          concurrent: true,
        })

        expect(ctx.errors.has(GitError)).toBe(true)
        expect(logger.printHistory()).toMatch(
          'Failed to calculate SHA-256 hash of unstaged changes'
        )
      })
    )

    it(
      'should handle done for changed files',
      withGitIntegration(async ({ cwd, expect }) => {
        const logger = makeConsoleMock()
        const gitWorkflow = new GitWorkflow({
          diff: 'HEAD..main',
          logger,
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
        })

        await gitWorkflow.runTasks(getInitialState(), [], {
          abortController: new AbortController(),
        })

        expect(logger.printHistory()).toMatch('Done running tasks for changed files')
      })
    )
  })

  describe('updateIndex', () => {
    it(
      'should chunk files for git add',
      withGitIntegration(async ({ cwd, expect, writeFile: writeRepoFile }) => {
        const files = ['first.js', 'second.js'].map((filename) =>
          normalizePath(path.join(cwd, filename))
        )

        await Promise.all(files.map((filename) => writeRepoFile(filename, 'test')))

        const gitWorkflow = new GitWorkflow({
          logger: makeConsoleMock(),
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
          matchedFiles: new Set(files.map((filepath) => ({ filepath, status: 'A' }))),
          maxArgLength: 1,
        })
        const execGit = vi.fn(gitWorkflow.execGit)
        gitWorkflow.execGit = execGit

        await gitWorkflow.updateIndex(getInitialState())

        expect(execGit).toHaveBeenNthCalledWith(1, ['add', '--', files[0]])
        expect(execGit).toHaveBeenNthCalledWith(2, ['add', '--', files[1]])
      })
    )

    it(
      "should not override GIT_INDEX_FILE value when it's the default value",
      withGitIntegration(async ({ cwd, execGit, expect }) => {
        const gitIndexFile = await execGit([
          'rev-parse',
          '--path-format=absolute',
          '--git-path',
          'index.lock',
        ])

        vi.stubEnv('GIT_INDEX_FILE', normalizePath(gitIndexFile))

        const gitWorkflow = new GitWorkflow({
          logger: makeConsoleMock(),
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
          matchedFiles: new Set(),
        })
        const ctx = getInitialState()

        await gitWorkflow.updateIndex(ctx)

        expect(ctx.errors.has(ApplyEmptyCommitError)).toBe(true)

        vi.unstubAllEnvs()
      })
    )

    it(
      "should override GIT_INDEX_FILE value when it's not the default value",
      withGitIntegration(async ({ cwd, execGit, expect }) => {
        const gitIndexFile = await execGit([
          'rev-parse',
          '--path-format=absolute',
          '--git-path',
          'next-index-5207.lock',
        ])

        vi.stubEnv('GIT_INDEX_FILE', normalizePath(gitIndexFile))

        const gitWorkflow = new GitWorkflow({
          logger: makeConsoleMock(),
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
          matchedFiles: new Set(),
        })
        const ctx = getInitialState()

        await gitWorkflow.updateIndex(ctx)

        expect(ctx.errors.has(ApplyEmptyCommitError)).toBe(true)

        vi.unstubAllEnvs()
      })
    )

    it(
      'should handle errors',
      withGitIntegration(async ({ cwd, expect }) => {
        const gitWorkflow = new GitWorkflow({
          logger: makeConsoleMock(),
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
          matchedFiles: new Set(),
        })

        // bad diff to produce error
        gitWorkflow.diff = 'foobar'

        const ctx = getInitialState()

        await gitWorkflow.updateIndex(ctx)

        expect(ctx.errors.has(GitError)).toBe(true)
      })
    )
  })

  describe('restoreMergeStatus', () => {
    it(
      'should handle error when restoring merge state fails',
      withGitIntegration(async ({ cwd, expect }) => {
        const gitWorkflow = new GitWorkflow({
          logger: makeConsoleMock(),
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
          matchedFiles: new Set(),
        })

        gitWorkflow.mergeHeadBuffer = true
        writeFile.mockImplementation(() => Promise.reject('test'))
        const ctx = getInitialState()
        await expect(gitWorkflow.restoreMergeStatus(ctx)).rejects.toThrow()

        expect(ctx.errors).toBeInstanceOf(Set)
        expect(ctx.errors.has(GitError)).toBe(true)
        expect(ctx.errors.has(RestoreMergeStatusError)).toBe(true)
      })
    )
  })

  describe('restoreUntrackedFiles', () => {
    it(
      'should handle error when restoring fails',
      withGitIntegration(async ({ cwd, expect }) => {
        const gitWorkflow = new GitWorkflow({
          logger: makeConsoleMock(),
          topLevelDir: cwd,
          gitConfigDir: path.join(cwd, './.git'),
          matchedFiles: new Set(),
        })

        const ctx = getInitialState()

        await gitWorkflow.restoreUntrackedFiles(ctx)

        expect(ctx.errors.has(RestoreUnstagedChangesError)).toBe(true)
        expect(ctx.errors.has(GitError)).toBe(true)
      })
    )
  })
})
