import path from 'path'

import makeConsoleMock from 'consolemock'
import execa from 'execa'
import normalize from 'normalize-path'

import { getStagedFiles } from '../lib/getStagedFiles'
import { GitWorkflow } from '../lib/gitWorkflow'
import { resolveGitRepo } from '../lib/resolveGitRepo'
import { runAll } from '../lib/runAll'
import { ConfigNotFoundError, GitError } from '../lib/symbols'
import * as searchConfigsNS from '../lib/searchConfigs'

import { createExecaReturnValue } from './utils/createExecaReturnValue'

jest.mock('../lib/file')
jest.mock('../lib/getStagedFiles')
jest.mock('../lib/gitWorkflow')
jest.mock('../lib/resolveGitRepo')

jest.mock('../lib/resolveConfig', () => ({
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
  return { gitConfigDir: normalize(path.resolve(cwd, '.git')), gitDir: normalize(cwd) }
})

const configPath = '.lintstagedrc.json'

describe('runAll', () => {
  const globalConsoleTemp = console

  beforeAll(() => {
    console = makeConsoleMock()
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
            Object {
              "errors": Set {},
              "hasPartiallyStagedFiles": null,
              "output": Array [
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
            Object {
              "errors": Set {},
              "hasPartiallyStagedFiles": null,
              "output": Array [
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
            Object {
              "errors": Set {},
              "hasPartiallyStagedFiles": null,
              "output": Array [],
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
    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG [STARTED] Preparing lint-staged...
      LOG [SUCCESS] Preparing lint-staged...
      LOG [STARTED] Running tasks for staged files...
      LOG [STARTED] Config object — 1 file
      LOG [STARTED] *.js — 1 file
      LOG [STARTED] echo \\"sample\\"
      LOG [SUCCESS] echo \\"sample\\"
      LOG [SUCCESS] *.js — 1 file
      LOG [SUCCESS] Config object — 1 file
      LOG [SUCCESS] Running tasks for staged files...
      LOG [STARTED] Applying modifications from tasks...
      LOG [SUCCESS] Applying modifications from tasks...
      LOG [STARTED] Cleaning up temporary files...
      LOG [SUCCESS] Cleaning up temporary files..."
    `)
  })

  it('should skip tasks if previous git error', async () => {
    expect.assertions(2)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    GitWorkflow.mockImplementationOnce(() => ({
      ...jest.requireActual('../lib/gitWorkflow'),
      prepare: (ctx) => {
        ctx.errors.add(GitError)
        throw new Error('test')
      },
    }))

    await expect(
      runAll({ configObject: { '*.js': ['echo "sample"'] }, configPath })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG [STARTED] Preparing lint-staged...
      ERROR [FAILED] test
      LOG [STARTED] Running tasks for staged files...
      INFO [SKIPPED] Running tasks for staged files...
      LOG [STARTED] Applying modifications from tasks...
      INFO [SKIPPED] 
      [SKIPPED]   ✖ lint-staged failed due to a git error.
      LOG [STARTED] Cleaning up temporary files...
      INFO [SKIPPED] 
      [SKIPPED]   ✖ lint-staged failed due to a git error."
    `)
  })

  it('should skip applying unstaged modifications if there are errors during linting', async () => {
    expect.assertions(2)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    execa.mockImplementation(() =>
      createExecaReturnValue({
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

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG [STARTED] Preparing lint-staged...
      LOG [SUCCESS] Preparing lint-staged...
      LOG [STARTED] Running tasks for staged files...
      LOG [STARTED] Config object — 1 file
      LOG [STARTED] *.js — 1 file
      LOG [STARTED] echo \\"sample\\"
      ERROR [FAILED] echo \\"sample\\" [1]
      ERROR [FAILED] echo \\"sample\\" [1]
      LOG [SUCCESS] Running tasks for staged files...
      LOG [STARTED] Applying modifications from tasks...
      INFO [SKIPPED] Skipped because of errors from tasks.
      LOG [STARTED] Reverting to original state because of errors...
      LOG [SUCCESS] Reverting to original state because of errors...
      LOG [STARTED] Cleaning up temporary files...
      LOG [SUCCESS] Cleaning up temporary files..."
    `)
  })

  it('should skip tasks and restore state if terminated', async () => {
    expect.assertions(2)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    execa.mockImplementation(() =>
      createExecaReturnValue({
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

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG [STARTED] Preparing lint-staged...
      LOG [SUCCESS] Preparing lint-staged...
      LOG [STARTED] Running tasks for staged files...
      LOG [STARTED] Config object — 1 file
      LOG [STARTED] *.js — 1 file
      LOG [STARTED] echo \\"sample\\"
      ERROR [FAILED] echo \\"sample\\" [KILLED]
      ERROR [FAILED] echo \\"sample\\" [KILLED]
      LOG [SUCCESS] Running tasks for staged files...
      LOG [STARTED] Applying modifications from tasks...
      INFO [SKIPPED] Skipped because of errors from tasks.
      LOG [STARTED] Reverting to original state because of errors...
      LOG [SUCCESS] Reverting to original state because of errors...
      LOG [STARTED] Cleaning up temporary files...
      LOG [SUCCESS] Cleaning up temporary files..."
    `)
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
    expect(expected).toEqual([[normalize(path.join(cwd, 'test/foo.js'))]])
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
        normalize(path.join(process.cwd(), 'test/foo.js')),
        normalize(path.join(process.cwd(), 'foo.js')),
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
})
