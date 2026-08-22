// oxlint-disable no-global-assign

import path from 'node:path'

import makeConsoleMock from 'consolemock'
import { afterAll, afterEach, beforeAll, describe, it, vi } from 'vitest'

import { normalizePath } from '../../lib/normalizePath.js'
import { parseOptions } from '../../lib/parseOptions.js'
import { TaskError } from '../../lib/symbols.js'

vi.mock('tinyexec', () => ({
  exec: vi.fn().mockReturnValue({
    async *[Symbol.asyncIterator]() {
      yield 'test'
    },
  }),
}))

vi.mock('../../lib/execGit.js', () => ({
  execGit: vi.fn(async () => 'test'),
}))

vi.mock('../../lib/getStagedFiles.js', () => ({
  getStagedFiles: vi.fn(async () => []),
}))

const mockGitWorkflow = {
  cleanup: vi.fn(() => Promise.resolve()),
  hideUnstagedChanges: vi.fn(() => Promise.resolve()),
  logger: makeConsoleMock(),
  prepare: vi.fn(() => Promise.resolve()),
  restoreOriginalState: vi.fn(() => Promise.resolve()),
  restoreUnstagedChanges: vi.fn(() => Promise.resolve()),
  runTasks: vi.fn(() => Promise.resolve()),
  updateIndex: vi.fn(() => Promise.resolve()),
}

vi.mock('../../lib/gitWorkflow.js', () => ({
  GitWorkflow: vi.fn(function () {
    return mockGitWorkflow
  }),
}))

vi.mock('../../lib/resolveGitRepo.js', () => ({
  resolveGitRepo: vi.fn(async () => {
    const cwd = process.cwd()
    return {
      gitConfigDir: normalizePath(path.resolve(cwd, '.git')),
      topLevelDir: normalizePath(cwd),
    }
  }),
}))

vi.mock('../../lib/searchConfigs.js', () => ({
  searchConfigs: vi.fn(async () => ({})),
}))

const { getStagedFiles } = await import('../../lib/getStagedFiles.js')
const { runAll } = await import('../../lib/runAll.js')
const { searchConfigs } = await import('../../lib/searchConfigs.js')
const { ConfigNotFoundError, GitError } = await import('../../lib/symbols.js')

const configPath = '.lintstagedrc.json'

describe('runAll', () => {
  const globalConsoleTemp = console

  beforeAll(() => {
    console = makeConsoleMock()
    mockGitWorkflow.logger = console
    vi.clearAllMocks()
  })

  afterEach(() => {
    console.clearHistory()
  })

  afterAll(() => {
    console = globalConsoleTemp
  })

  it('should resolve the promise with no tasks', async ({ expect }) => {
    expect.assertions(1)
    await expect(runAll(parseOptions({}))).resolves.toBeTruthy()
  })

  it('should enable debug logs', async ({ expect }) => {
    expect.assertions(1)
    await expect(runAll(parseOptions({ debug: true }))).resolves.toBeTruthy()
  })

  it('should throw when failed to find staged files', async ({ expect }) => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => null)
    await expect(runAll(parseOptions({ configObject: {}, configPath }))).rejects.toThrow(
      'lint-staged failed'
    )
  })

  it('should throw when failed to find staged files and quiet', async ({ expect }) => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => null)
    await expect(
      runAll(parseOptions({ configObject: {}, configPath, quiet: true }))
    ).rejects.toThrow('lint-staged failed')
  })

  it('should print output when no staged files', async ({ expect }) => {
    expect.assertions(1)
    await expect(runAll(parseOptions({ configObject: {}, configPath }))).resolves.toMatchObject({
      output: [expect.stringContaining('could not find any staged files')],
      quiet: false,
    })
  })

  it('should not print output when no staged files and quiet', async ({ expect }) => {
    expect.assertions(1)
    await expect(
      runAll(parseOptions({ configObject: {}, configPath, quiet: true }))
    ).resolves.toMatchObject({
      output: [],
      quiet: true,
    })
  })

  it('should resolve the promise with no files', async ({ expect }) => {
    expect.assertions(1)
    await runAll(parseOptions({ configObject: { '*.js': ['echo "sample"'] }, configPath }))
    expect(console.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should use an injected logger', async ({ expect }) => {
    expect.assertions(1)
    const logger = makeConsoleMock()
    await runAll(parseOptions({ configObject: { '*.js': ['echo "sample"'] }, configPath }), logger)
    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should exit without output when no staged files match configured tasks and quiet', async ({
    expect,
  }) => {
    expect.assertions(2)

    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockResolvedValueOnce({
      '': { '*.css': 'echo "sample"' },
    })

    await expect(runAll(parseOptions({ quiet: true }))).resolves.toBeTruthy()

    expect(console.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should skip tasks if previous git error', async ({ expect }) => {
    expect.assertions(2)

    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockResolvedValueOnce({
      '': { '*.js': 'echo "sample"' },
    })

    mockGitWorkflow.prepare.mockImplementationOnce((ctx) => {
      ctx.errors.add(GitError)
    })

    await expect(runAll(parseOptions({}))).rejects.toThrow('lint-staged failed')

    expect(console.printHistory()).toMatch('Skipped running tasks')
  })

  it('should skip applying unstaged modifications if there are errors during a task', async ({
    expect,
  }) => {
    expect.assertions(2)

    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockResolvedValueOnce({
      '': { '*.js': 'echo "sample"' },
    })

    mockGitWorkflow.runTasks.mockImplementationOnce(async (ctx) => {
      ctx.errors.add(TaskError)
    })

    await expect(runAll(parseOptions({}))).rejects.toThrow('lint-staged failed')

    expect(console.printHistory()).toMatch('Skipped staging changes from tasks')
  })

  it('should skip restoring untracked files if there are errors during a task', async ({
    expect,
  }) => {
    expect.assertions(2)

    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockResolvedValueOnce({
      '': { '*.js': 'echo "sample"' },
    })

    mockGitWorkflow.runTasks.mockImplementationOnce(async (ctx) => {
      ctx.errors.add(TaskError)
    })

    await expect(runAll(parseOptions({ hideAll: true }))).rejects.toThrow('lint-staged failed')

    expect(console.printHistory()).toMatch('Skipped restoring untracked files')
  })

  it('should skip reverting to original state if there are errors during a task', async ({
    expect,
  }) => {
    expect.assertions(2)

    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockResolvedValueOnce({
      '': { '*.js': 'echo "sample"' },
    })

    mockGitWorkflow.runTasks.mockImplementationOnce(async (ctx) => {
      ctx.errors.add(TaskError)
      ctx.errors.add(GitError)
    })

    await expect(runAll(parseOptions({}))).rejects.toThrow('lint-staged failed')

    expect(console.printHistory()).toMatch('Skipped reverting to original state because of errors')
  })

  it('should resolve matched files to default cwd with multiple configs', async ({ expect }) => {
    getStagedFiles.mockImplementationOnce(async () => [
      { filepath: 'lib/foo.js', status: 'A' },
      { filepath: 'test/foo.js', status: 'A' },
    ])

    const mockTask = vi.fn(() => ['echo "sample"'])

    searchConfigs.mockResolvedValueOnce({
      'lib/.lintstagedrc.json': { '*.js': mockTask },
      'test/.lintstagedrc.json': { '*.js': mockTask },
    })

    await runAll(
      parseOptions({
        stash: false,
        relative: true,
      })
    )

    expect(mockTask).toHaveBeenCalledTimes(2)
    expect(mockTask).toHaveBeenNthCalledWith(1, ['foo.js'])
    expect(mockTask).toHaveBeenNthCalledWith(2, ['foo.js'])
  })

  it('should resolve matched files to explicit cwd with multiple configs', async ({ expect }) => {
    getStagedFiles.mockImplementationOnce(async () => [
      { filepath: 'lib/foo.js', status: 'A' },
      { filepath: 'test/foo.js', status: 'A' },
    ])

    const mockTask = vi.fn(() => ['echo "sample"'])

    searchConfigs.mockResolvedValueOnce({
      'lib/.lintstagedrc.json': { '*.js': mockTask },
      'test/.lintstagedrc.json': { '*.js': mockTask },
    })

    await runAll(
      parseOptions({
        cwd: '.',
        stash: false,
        relative: true,
      })
    )

    expect(mockTask).toHaveBeenCalledTimes(2)
    expect(mockTask).toHaveBeenNthCalledWith(1, ['lib/foo.js'])
    expect(mockTask).toHaveBeenNthCalledWith(2, ['test/foo.js'])
  })

  it('should error when no configurations found', async ({ expect }) => {
    getStagedFiles.mockImplementationOnce(async () => [
      { filepath: 'foo.js', status: 'A' },
      { filepath: 'test/foo.js', status: 'A' },
    ])

    searchConfigs.mockResolvedValueOnce({})

    expect.assertions(1)

    try {
      await runAll(
        parseOptions({
          cwd: '.',
          stash: false,
          relative: true,
        })
      )
      expect.fail()
    } catch ({ ctx }) {
      expect(ctx.errors.has(ConfigNotFoundError)).toBe(true)
    }
  })

  it('should warn when "git add" was used in commands', async ({ expect }) => {
    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockResolvedValueOnce({
      '.lintstagedrc.json': { '*.js': 'git add' },
    })

    await runAll(parseOptions({}))
    expect(console.printHistory()).toMatch('Some of your tasks use `git add` command')
  })

  it('should warn when "git add" was used in parallel commands', async ({ expect }) => {
    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockResolvedValueOnce({
      '.lintstagedrc.json': { '*.js': ['prettier', ['eslint', 'git add']] },
    })

    await runAll(parseOptions({}))

    expect(console.printHistory()).toMatch('Some of your tasks use `git add` command')
  })

  it('should not warn about "git add" when --quiet was used', async ({ expect }) => {
    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockResolvedValueOnce({
      '.lintstagedrc.json': { '*.js': ['git add'] },
    })
    await runAll(parseOptions({ quiet: true }))
    expect(console.printHistory()).toEqual('')
  })

  it('should warn when --no-stash was used', async ({ expect }) => {
    await runAll(parseOptions({ configObject: { '*.js': ['echo "sample"'] }, stash: false }))
    expect(console.printHistory()).toMatch(
      'Skipping backup because `--no-stash` was used. This might result in data loss.'
    )
  })

  it('should not warn when --no-stash was used together with --quiet', async ({ expect }) => {
    await runAll(
      parseOptions({ configObject: { '*.js': ['echo "sample"'] }, stash: false, quiet: true })
    )
    expect(console.printHistory()).toEqual('')
  })

  it('should warn when --diff was used', async ({ expect }) => {
    await runAll(
      parseOptions({ configObject: { '*.js': ['echo "sample"'] }, diff: 'branch1...branch2' })
    )
    expect(console.printHistory()).toMatch('Skipping backup because `--diff` was used.')
  })

  it('should warn when --no-hide-partially-staged was used', async ({ expect }) => {
    await runAll(
      parseOptions({ configObject: { '*.js': ['echo "sample"'] }, hidePartiallyStaged: false })
    )
    expect(console.printHistory()).toMatch(
      'Skipping hiding unstaged changes from partially staged files because `--no-hide-partially-staged` was used.'
    )
  })
})
