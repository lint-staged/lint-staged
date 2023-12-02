import path from 'node:path'

import makeConsoleMock from 'consolemock'
import { execa } from 'execa'

import { getStagedFiles } from '../../lib/getStagedFiles.js'
import { GitWorkflow } from '../../lib/gitWorkflow.js'
import { normalizePath } from '../../lib/normalizePath.js'
import { resolveGitRepo } from '../../lib/resolveGitRepo.js'
import { runAll } from '../../lib/runAll.js'
import * as searchConfigsNS from '../../lib/searchConfigs.js'
import { ConfigNotFoundError, GitError } from '../../lib/symbols.js'

import { mockExecaReturnValue } from './__utils__/mockExecaReturnValue.js'

jest.mock('execa', () => ({
  execa: jest.fn(() => mockExecaReturnValue()),
}))

jest.mock('../../lib/file.js')
jest.mock('../../lib/getStagedFiles.js')
jest.mock('../../lib/gitWorkflow.js')
jest.mock('../../lib/resolveGitRepo.js')

jest.mock('../../lib/resolveConfig.js', () => ({
  /** Unfortunately necessary due to non-ESM tests. */
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))

const searchConfigs = jest.spyOn(searchConfigsNS, 'searchConfigs')

getStagedFiles.mockImplementation(async () => [])

resolveGitRepo.mockImplementation(async () => {
  const cwd = process.cwd()
  return { gitConfigDir: normalizePath(path.resolve(cwd, '.git')), gitDir: normalizePath(cwd) }
})

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
    await expect(runAll({ configObject: {}, configPath })).resolves.toMatchInlineSnapshot(`
      {
        "errors": Set {},
        "events": EventEmitter {
          "_events": {},
          "_eventsCount": 0,
          "_maxListeners": undefined,
          Symbol(shapeMode): false,
          Symbol(kCapture): false,
        },
        "hasPartiallyStagedFiles": null,
        "output": [
          "→ No staged files found.",
        ],
        "quiet": false,
        "shouldBackup": true,
      }
    `)
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
    await expect(runAll({ configObject: {}, configPath })).resolves.toMatchInlineSnapshot(`
      {
        "errors": Set {},
        "events": EventEmitter {
          "_events": {},
          "_eventsCount": 0,
          "_maxListeners": undefined,
          Symbol(shapeMode): false,
          Symbol(kCapture): false,
        },
        "hasPartiallyStagedFiles": null,
        "output": [
          "→ No staged files found.",
        ],
        "quiet": false,
        "shouldBackup": true,
      }
    `)
  })

  it('should not print output when no staged files and quiet', async () => {
    expect.assertions(1)
    await expect(runAll({ configObject: {}, configPath, quiet: true })).resolves
      .toMatchInlineSnapshot(`
        {
          "errors": Set {},
          "events": EventEmitter {
            "_events": {},
            "_eventsCount": 0,
            "_maxListeners": undefined,
            Symbol(shapeMode): false,
            Symbol(kCapture): false,
          },
          "hasPartiallyStagedFiles": null,
          "output": [],
          "quiet": true,
          "shouldBackup": true,
        }
      `)
  })

  it('should resolve the promise with no files', async () => {
    expect.assertions(1)
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, configPath })
    expect(console.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should use an injected logger', async () => {
    expect.assertions(1)
    const logger = makeConsoleMock()
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, configPath, debug: true }, logger)
    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should exit without output when no staged files match configured tasks and quiet', async () => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    await runAll({ configObject: { '*.css': ['echo "sample"'] }, configPath, quiet: true })
    expect(console.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should not skip tasks if there are files', async () => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, configPath })
    expect(console.printHistory()).toMatch(/"data":"COMPLETED".*Running tasks for staged files/)
  })

  it('should skip tasks if previous git error', async () => {
    expect.assertions(2)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    GitWorkflow.mockImplementationOnce(() => ({
      ...jest.requireActual('../../lib/gitWorkflow.js'),
      prepare: (ctx) => {
        ctx.errors.add(GitError)
        throw new Error('test error')
      },
    }))

    await expect(
      runAll({ configObject: { '*.js': ['echo "sample"'] }, configPath })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatch(/"data":"SKIPPED".*Running tasks for staged files/)
  })

  it('should skip applying unstaged modifications if there are errors during linting', async () => {
    expect.assertions(2)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    execa.mockImplementation(() =>
      mockExecaReturnValue({
        stdout: '',
        stderr: 'Linter finished with error',
        code: 1,
        failed: true,
        cmd: 'mock cmd',
      })
    )

    await expect(
      runAll({ configObject: { '*.js': ['echo "sample"'] }, configPath })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatch(/"data":"SKIPPED".*Applying modifications from tasks/)
  })

  it('should skip tasks and restore state if terminated', async () => {
    expect.assertions(2)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    execa.mockImplementation(() =>
      mockExecaReturnValue({
        stdout: '',
        stderr: '',
        code: 0,
        failed: false,
        killed: true,
        signal: 'SIGINT',
        cmd: 'mock cmd',
      })
    )

    await expect(
      runAll({ configObject: { '*.js': ['echo "sample"'] }, configPath })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatch(
      /"data":"COMPLETED".*Reverting to original state because of errors/
    )
  })

  it('should resolve matched files to cwd when using relative option', async () => {
    // A staged file inside test/, which will be our cwd
    getStagedFiles.mockImplementationOnce(async () => ['test/foo.js'])

    // We are only interested in the `matchedFileChunks` generation
    let expected
    const mockConstructor = jest.fn(({ matchedFileChunks }) => (expected = matchedFileChunks))
    GitWorkflow.mockImplementationOnce(mockConstructor)

    const mockTask = jest.fn(() => ['echo "sample"'])

    // actual cwd
    const cwd = process.cwd()
    // For the test, set cwd in test/
    const innerCwd = path.join(cwd, 'test/')

    // Run lint-staged in `innerCwd` with relative option
    // This means the sample task will receive `foo.js`
    await expect(
      runAll({
        configObject: { '*.js': mockTask },
        configPath,
        stash: false,
        relative: true,
        cwd: innerCwd,
      })
    ).rejects.toThrowError()

    // task received relative `foo.js`
    expect(mockTask).toHaveBeenCalledTimes(1)
    expect(mockTask).toHaveBeenCalledWith(['foo.js'])
    // GitWorkflow received absolute `test/foo.js`
    expect(mockConstructor).toHaveBeenCalledTimes(1)
    expect(expected).toEqual([[normalizePath(path.join(cwd, 'test/foo.js'))]])
  })

  it('should resolve matched files to config locations with multiple configs', async () => {
    getStagedFiles.mockImplementationOnce(async () => ['foo.js', 'test/foo.js'])

    const mockTask = jest.fn(() => ['echo "sample"'])

    searchConfigs.mockResolvedValueOnce({
      'test/.lintstagedrc.json': { '*.js': mockTask },
      '.lintstagedrc.json': { '*.js': mockTask },
    })

    // We are only interested in the `matchedFileChunks` generation
    let expected
    const mockConstructor = jest.fn(({ matchedFileChunks }) => (expected = matchedFileChunks))
    GitWorkflow.mockImplementationOnce(mockConstructor)

    await expect(runAll({ stash: false, relative: true })).rejects.toThrowError()

    // task received relative `foo.js` from both directories
    expect(mockTask).toHaveBeenCalledTimes(2)
    expect(mockTask).toHaveBeenNthCalledWith(1, ['foo.js'])
    expect(mockTask).toHaveBeenNthCalledWith(2, ['foo.js'])
    // GitWorkflow received absolute paths `foo.js` and `test/foo.js`
    expect(mockConstructor).toHaveBeenCalledTimes(1)
    expect(expected).toEqual([
      [
        normalizePath(path.join(process.cwd(), 'test/foo.js')),
        normalizePath(path.join(process.cwd(), 'foo.js')),
      ],
    ])
  })

  it('should resolve matched files to explicit cwd with multiple configs', async () => {
    getStagedFiles.mockImplementationOnce(async () => ['foo.js', 'test/foo.js'])

    const mockTask = jest.fn(() => ['echo "sample"'])

    searchConfigs.mockResolvedValueOnce({
      'test/.lintstagedrc.json': { '*.js': mockTask },
      '.lintstagedrc.json': { '*.js': mockTask },
    })

    await expect(
      runAll({
        cwd: '.',
        stash: false,
        relative: true,
      })
    ).rejects.toThrowError()

    expect(mockTask).toHaveBeenCalledTimes(2)
    // This is now relative to "." instead of "test/"
    expect(mockTask).toHaveBeenNthCalledWith(1, ['test/foo.js'])
    expect(mockTask).toHaveBeenNthCalledWith(2, ['foo.js'])
  })

  it('should error when no configurations found', async () => {
    getStagedFiles.mockImplementationOnce(async () => ['foo.js', 'test/foo.js'])

    searchConfigs.mockResolvedValueOnce({})

    expect.assertions(1)

    try {
      await runAll({
        cwd: '.',
        stash: false,
        relative: true,
      })
    } catch ({ ctx }) {
      expect(ctx.errors.has(ConfigNotFoundError)).toBe(true)
    }
  })

  it('should warn when "git add" was used in commands', async () => {
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    await expect(runAll({ configObject: { '*.js': ['git add'] } })).rejects.toThrowError()
    expect(console.printHistory()).toMatch('Some of your tasks use `git add` command')
  })

  it('should not warn about "git add" when --quiet was used', async () => {
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    await expect(
      runAll({ configObject: { '*.js': ['git add'] }, quiet: true })
    ).rejects.toThrowError()
    expect(console.printHistory()).toEqual('')
  })

  it('should warn when --no-stash was used', async () => {
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, stash: false })
    expect(console.printHistory()).toMatch('Skipping backup because `--no-stash` was used')
  })

  it('should not warn when --no-stash was used together with --quiet', async () => {
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, stash: false, quiet: true })
    expect(console.printHistory()).toEqual('')
  })

  it('should warn when --diff was used', async () => {
    await runAll({ configObject: { '*.js': ['echo "sample"'] }, diff: 'branch1...branch2' })
    expect(console.printHistory()).toMatch('Skipping backup because `--diff` was used')
  })
})
