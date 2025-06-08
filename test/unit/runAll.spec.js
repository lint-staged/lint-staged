import path from 'node:path'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'
import { SubprocessError } from 'nano-spawn'

import { normalizePath } from '../../lib/normalizePath.js'
import { getMockNanoSpawn } from './__utils__/getMockNanoSpawn.js'
import { mockNanoSpawnReturnValue } from './__utils__/mockNanoSpawnReturnValue.js'

const { default: spawn } = await getMockNanoSpawn()

jest.unstable_mockModule('../../lib/getStagedFiles.js', () => ({
  getStagedFiles: jest.fn(async () => []),
}))

const mockGitWorkflow = {
  prepare: jest.fn(() => Promise.resolve()),
  hideUnstagedChanges: jest.fn(() => Promise.resolve()),
  applyModifications: jest.fn(() => Promise.resolve()),
  restoreUnstagedChanges: jest.fn(() => Promise.resolve()),
  restoreOriginalState: jest.fn(() => Promise.resolve()),
  cleanup: jest.fn(() => Promise.resolve()),
}

jest.unstable_mockModule('../../lib/gitWorkflow.js', () => ({
  GitWorkflow: jest.fn(() => mockGitWorkflow),
}))

jest.unstable_mockModule('../../lib/resolveGitRepo.js', () => ({
  resolveGitRepo: jest.fn(async () => {
    const cwd = process.cwd()
    return {
      gitConfigDir: normalizePath(path.resolve(cwd, '.git')),
      topLevelDir: normalizePath(cwd),
    }
  }),
}))

jest.unstable_mockModule('../../lib/searchConfigs.js', () => ({
  searchConfigs: jest.fn(async () => ({})),
}))

const { getStagedFiles } = await import('../../lib/getStagedFiles.js')
const { GitWorkflow } = await import('../../lib/gitWorkflow.js')
const { runAll } = await import('../../lib/runAll.js')
const { searchConfigs } = await import('../../lib/searchConfigs.js')
const { ConfigNotFoundError, GitError } = await import('../../lib/symbols.js')

const configPath = '.lintstagedrc.json'

describe('runAll', () => {
  const globalConsoleTemp = console

  beforeAll(() => {
    console = makeConsoleMock()
    jest.clearAllMocks()
  })

  afterEach(() => {
    console.clearHistory()
  })

  afterAll(() => {
    console = globalConsoleTemp
  })

  it('should resolve the promise with no tasks', async () => {
    expect.assertions(1)
    await expect(runAll({})).resolves.toBeTruthy()
  })

  it('should enable debug logs', async () => {
    expect.assertions(1)
    await expect(runAll({ debug: true })).resolves.toBeTruthy()
  })

  it('should throw when failed to find staged files', async () => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => null)
    await expect(
      runAll({ configObject: {}, configPath })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)
  })

  it('should throw when failed to find staged files and quiet', async () => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => null)
    await expect(
      runAll({ configObject: {}, configPath, quiet: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)
  })

  it('should print output when no staged files', async () => {
    expect.assertions(1)
    await expect(runAll({ configObject: {}, configPath })).resolves.toMatchObject({
      output: [expect.stringContaining('No staged files found')],
      quiet: false,
    })
  })

  it('should not print output when no staged files and quiet', async () => {
    expect.assertions(1)
    await expect(runAll({ configObject: {}, configPath, quiet: true })).resolves.toMatchObject({
      output: [],
      quiet: true,
    })
  })

  it('should resolve the promise with no files', async () => {
    expect.assertions(1)
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, configPath })
    expect(console.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should use an injected logger', async () => {
    expect.assertions(1)
    const logger = makeConsoleMock()
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, configPath }, logger)
    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should exit without output when no staged files match configured tasks and quiet', async () => {
    expect.assertions(2)

    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockImplementationOnce(async () => ({
      '': { '*.css': 'echo "sample"' },
    }))

    await expect(runAll({ quiet: true })).resolves.toBeTruthy()

    expect(console.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should not skip tasks if there are files', async () => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockImplementationOnce(async () => ({
      '': { '*.js': 'echo "sample"' },
    }))

    await runAll({})

    expect(console.printHistory()).toMatch(/"data":"COMPLETED".*Running tasks for staged files/)
  })

  it('should skip tasks if previous git error', async () => {
    expect.assertions(2)

    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockImplementationOnce(async () => ({
      '': { '*.js': 'echo "sample"' },
    }))

    mockGitWorkflow.prepare.mockImplementationOnce((ctx) => {
      ctx.errors.add(GitError)
      throw new Error('test')
    })

    await expect(runAll({})).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatch(/"data":"SKIPPED".*Running tasks for staged files/)
  })

  it('should skip applying unstaged modifications if there are errors during a task', async () => {
    expect.assertions(2)

    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockImplementationOnce(async () => ({
      '': { '*.js': 'echo "sample"' },
    }))

    spawn.mockImplementationOnce(() =>
      mockNanoSpawnReturnValue({
        output: 'Has staged files',
        nodeChildProcess: { pid: 0 },
      })
    )

    spawn.mockImplementationOnce(() =>
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: 'Has staged files',
          nodeChildProcess: { pid: 0 },
        })
      )
    )

    await expect(runAll({})).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatch(/"data":"SKIPPED".*Applying modifications from tasks/)
  })

  it('should skip tasks and restore state if terminated', async () => {
    expect.assertions(2)

    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockImplementationOnce(async () => ({
      '': { '*.js': 'echo "sample"' },
    }))

    spawn.mockImplementationOnce(() =>
      mockNanoSpawnReturnValue({
        output: 'Has staged files',
        nodeChildProcess: { pid: 0 },
      })
    )

    spawn.mockImplementationOnce(() =>
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: '',
          signalName: 'SIGINT',
          nodeChildProcess: { pid: 0 },
        })
      )
    )

    await expect(runAll({})).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatch(
      /"data":"COMPLETED".*Reverting to original state because of errors/
    )
  })

  it('should resolve matched files to cwd when using relative option', async () => {
    // A staged file inside test/, which will be our cwd
    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'test/foo.js', status: 'A' }])

    // We are only interested in the `matchedFileChunks` generation
    let expected
    const mockConstructor = jest.fn(({ matchedFileChunks }) => (expected = matchedFileChunks))
    GitWorkflow.mockImplementationOnce(mockConstructor)

    const mockTask = jest.fn(() => ['echo "sample"'])

    searchConfigs.mockImplementationOnce(async () => ({
      '': { '*.js': mockTask },
    }))

    // actual cwd
    const cwd = process.cwd()
    // For the test, set cwd in test/
    const innerCwd = path.join(cwd, 'test/')

    // Run lint-staged in `innerCwd` with relative option
    // This means the sample task will receive `foo.js`
    await runAll({
      stash: false,
      relative: true,
      cwd: innerCwd,
    })

    // task received relative `foo.js`
    expect(mockTask).toHaveBeenCalledTimes(1)
    expect(mockTask).toHaveBeenCalledWith(['foo.js'])
    // GitWorkflow received absolute `test/foo.js`
    expect(mockConstructor).toHaveBeenCalledTimes(1)
    expect(expected).toEqual([
      [
        {
          filepath: normalizePath(path.join(cwd, 'test/foo.js')),
          status: 'A',
        },
      ],
    ])
  })

  it('should resolve matched files to config locations with multiple configs', async () => {
    getStagedFiles.mockImplementationOnce(async () => [
      { filepath: 'foo.js', status: 'A' },
      { filepath: 'test/foo.js', status: 'A' },
    ])

    const mockTask = jest.fn(() => ['echo "sample"'])

    searchConfigs.mockResolvedValueOnce({
      'test/.lintstagedrc.json': { '*.js': mockTask },
      '.lintstagedrc.json': { '*.js': mockTask },
    })

    // We are only interested in the `matchedFileChunks` generation
    let expected
    const mockConstructor = jest.fn(({ matchedFileChunks }) => (expected = matchedFileChunks))
    GitWorkflow.mockImplementationOnce(mockConstructor)

    await runAll({
      stash: false,
      relative: true,
    })

    // task received relative `foo.js` from both directories
    expect(mockTask).toHaveBeenCalledTimes(2)
    expect(mockTask).toHaveBeenNthCalledWith(1, ['foo.js'])
    expect(mockTask).toHaveBeenNthCalledWith(2, ['foo.js'])
    // GitWorkflow received absolute paths `foo.js` and `test/foo.js`
    expect(mockConstructor).toHaveBeenCalledTimes(1)
    expect(expected).toEqual([
      [
        { filepath: normalizePath(path.join(process.cwd(), 'test/foo.js')), status: 'A' },
        { filepath: normalizePath(path.join(process.cwd(), 'foo.js')), status: 'A' },
      ],
    ])
  })

  it('should resolve matched files to explicit cwd with multiple configs', async () => {
    getStagedFiles.mockImplementationOnce(async () => [
      { filepath: 'foo.js', status: 'A' },
      { filepath: 'test/foo.js', status: 'A' },
    ])

    const mockTask = jest.fn(() => ['echo "sample"'])

    searchConfigs.mockResolvedValueOnce({
      'test/.lintstagedrc.json': { '*.js': mockTask },
      '.lintstagedrc.json': { '*.js': mockTask },
    })

    await runAll({
      cwd: '.',
      stash: false,
      relative: true,
    })

    expect(mockTask).toHaveBeenCalledTimes(2)
    // This is now relative to "." instead of "test/"
    expect(mockTask).toHaveBeenNthCalledWith(1, ['test/foo.js'])
    expect(mockTask).toHaveBeenNthCalledWith(2, ['foo.js'])
  })

  it('should error when no configurations found', async () => {
    getStagedFiles.mockImplementationOnce(async () => [
      { filepath: 'foo.js', status: 'A' },
      { filepath: 'test/foo.js', status: 'A' },
    ])

    searchConfigs.mockResolvedValueOnce({})

    expect.assertions(1)

    try {
      await runAll({
        cwd: '.',
        stash: false,
        relative: true,
      })
    } catch ({ ctx }) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(ctx.errors.has(ConfigNotFoundError)).toBe(true)
    }
  })

  it('should warn when "git add" was used in commands', async () => {
    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    searchConfigs.mockResolvedValueOnce({
      '.lintstagedrc.json': { '*.js': 'git add' },
    })

    await runAll({})
    expect(console.printHistory()).toMatch('Some of your tasks use `git add` command')
  })

  it('should not warn about "git add" when --quiet was used', async () => {
    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.js', status: 'A' }])
    await expect(runAll({ configObject: { '*.js': ['git add'] }, quiet: true })).rejects.toThrow()
    expect(console.printHistory()).toEqual('')
  })

  it('should warn when --no-stash was used', async () => {
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, stash: false })
    expect(console.printHistory()).toMatch(
      'Skipping backup because `--no-stash` was used. This might result in data loss.'
    )
  })

  it('should not warn when --no-stash was used together with --quiet', async () => {
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, stash: false, quiet: true })
    expect(console.printHistory()).toEqual('')
  })

  it('should warn when --diff was used', async () => {
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, diff: 'branch1...branch2' })
    expect(console.printHistory()).toMatch('Skipping backup because `--diff` was used.')
  })

  it('should warn when --no-hide-partially-staged was used', async () => {
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, hidePartiallyStaged: false })
    expect(console.printHistory()).toMatch(
      'Skipping hiding unstaged changes from partially staged files because `--no-hide-partially-staged` was used.'
    )
  })

  it('should support function tasks', async () => {
    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'foo.js', status: 'A' }])

    const task = jest.fn()
    const configObject = { '*.js': { title: 'My task', task } }

    searchConfigs.mockImplementationOnce(async () => ({
      '': configObject,
    }))

    await runAll({
      configObject: { '*.js': { title: 'My task', task } },
      relative: true, // make sure filenames are relative for easier assertion below
    })

    expect(task).toHaveBeenCalledTimes(1)
    expect(task).toHaveBeenCalledWith(['foo.js'])
  })
})
