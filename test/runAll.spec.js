import path from 'path'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'
import normalize from 'normalize-path'

import { ConfigObjectSymbol } from '../lib/symbols.js'

import { createExecaReturnValue } from './utils/createExecaReturnValue.js'
import { mockExeca } from './utils/mockExeca.js'

const { execa } = await mockExeca()

jest.unstable_mockModule('../lib/getStagedFiles.js', () => ({
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

jest.unstable_mockModule('../lib/gitWorkflow.js', () => ({
  GitWorkflow: jest.fn(() => mockGitWorkflow),
}))

jest.unstable_mockModule('../lib/resolveGitRepo.js', () => ({
  resolveGitRepo: jest.fn(async () => {
    const cwd = process.cwd()
    return { gitConfigDir: normalize(path.resolve(cwd, '.git')), gitDir: normalize(cwd) }
  }),
}))

jest.unstable_mockModule('../lib/searchConfigs.js', () => ({
  searchConfigs: jest.fn(async () => ({})),
}))

const { getStagedFiles } = await import('../lib/getStagedFiles.js')
const { GitWorkflow } = await import('../lib/gitWorkflow.js')
const { runAll } = await import('../lib/runAll.js')
const { searchConfigs } = await import('../lib/searchConfigs.js')
const { ConfigNotFoundError, GitError } = await import('../lib/symbols.js')

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

    await expect(runAll({})).resolves.toMatchInlineSnapshot(`
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

    await expect(runAll({})).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)
  })

  it('should not print output when no staged files and quiet', async () => {
    expect.assertions(1)

    await expect(runAll({ quiet: true })).resolves.toMatchInlineSnapshot(`
            Object {
              "errors": Set {},
              "hasPartiallyStagedFiles": null,
              "output": Array [],
              "quiet": true,
              "shouldBackup": true,
            }
          `)
  })

  it('should exit without output when no staged files match configured tasks and quiet', async () => {
    expect.assertions(1)

    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    searchConfigs.mockImplementationOnce(async () => ({
      [ConfigObjectSymbol]: { '*.css': 'echo "sample"' },
    }))

    await runAll({}).catch(() => {})

    expect(console.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should not skip tasks if there are files', async () => {
    expect.assertions(1)

    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    searchConfigs.mockImplementationOnce(async () => ({
      [ConfigObjectSymbol]: { '*.js': 'echo "sample"' },
    }))

    await runAll({})
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
    searchConfigs.mockImplementationOnce(async () => ({
      [ConfigObjectSymbol]: { '*.js': 'echo "sample"' },
    }))

    mockGitWorkflow.prepare.mockImplementationOnce((ctx) => {
      ctx.errors.add(GitError)
      throw new Error('test')
    })

    await expect(runAll({})).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

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
    searchConfigs.mockImplementationOnce(async () => ({
      [ConfigObjectSymbol]: { '*.js': 'echo "sample"' },
    }))

    execa.mockImplementation(() =>
      createExecaReturnValue({
        stdout: '',
        stderr: 'Linter finished with error',
        code: 1,
        failed: true,
        cmd: 'mock cmd',
      })
    )

    await expect(runAll({})).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

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
    searchConfigs.mockImplementationOnce(async () => ({
      [ConfigObjectSymbol]: { '*.js': 'echo "sample"' },
    }))

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

    await expect(runAll({})).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

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

    searchConfigs.mockImplementationOnce(async () => ({
      [ConfigObjectSymbol]: { '*.js': mockTask },
    }))

    // actual cwd
    const cwd = process.cwd()
    // For the test, set cwd in test/
    const innerCwd = path.join(cwd, 'test/')

    // Run lint-staged in `innerCwd` with relative option
    // This means the sample task will receive `foo.js`
    await expect(
      runAll({
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
