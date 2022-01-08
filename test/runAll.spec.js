import path from 'path'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'
import normalize from 'normalize-path'

jest.unstable_mockModule('execa', () => {
  const result = {
    stdout: 'a-ok',
    stderr: '',
    code: 0,
    cmd: 'mock cmd',
    failed: false,
    killed: false,
    signal: null,
  }

  return { execa: jest.fn(async () => result), execaCommand: jest.fn(async () => result) }
})

jest.unstable_mockModule('../lib/file.js', () => ({}))
jest.unstable_mockModule('../lib/getStagedFiles.js', () => ({ getStagedFiles: jest.fn() }))

const mockPrepare = jest.fn(() => Promise.resolve())

jest.unstable_mockModule('../lib/gitWorkflow.js', () => ({
  GitWorkflow: jest.fn(() => ({
    prepare: mockPrepare,
    hideUnstagedChanges: jest.fn(() => Promise.resolve()),
    applyModifications: jest.fn(() => Promise.resolve()),
    restoreUnstagedChanges: jest.fn(() => Promise.resolve()),
    restoreOriginalState: jest.fn(() => Promise.resolve()),
    cleanup: jest.fn(() => Promise.resolve()),
  })),
}))
jest.unstable_mockModule('../lib/resolveGitRepo.js', () => ({ resolveGitRepo: jest.fn() }))

const { execa } = await import('execa')
const { getStagedFiles } = await import('../lib/getStagedFiles.js')
const { GitWorkflow } = await import('../lib/gitWorkflow.js')
const { resolveGitRepo } = await import('../lib/resolveGitRepo.js')
const { runAll } = await import('../lib/runAll.js')
const { GitError } = await import('../lib/symbols.js')

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
      LOG [STARTED]  — 1 file
      LOG [STARTED] *.js — 1 file
      LOG [STARTED] echo \\"sample\\"
      LOG [SUCCESS] echo \\"sample\\"
      LOG [SUCCESS] *.js — 1 file
      LOG [SUCCESS]  — 1 file
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

    mockPrepare.mockImplementationOnce((ctx) => {
      ctx.errors.add(GitError)
      throw new Error('test')
    })

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
      Promise.resolve({
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
      LOG [STARTED]  — 1 file
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
      Promise.resolve({
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
      LOG [STARTED]  — 1 file
      LOG [STARTED] *.js — 1 file
      LOG [STARTED] echo \\"sample\\"
      ERROR [FAILED] echo \\"sample\\" [SIGINT]
      ERROR [FAILED] echo \\"sample\\" [SIGINT]
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
    try {
      // Run lint-staged in `innerCwd` with relative option
      // This means the sample task will receive `foo.js`
      await runAll({
        configObject: { '*.js': mockTask },
        configPath,
        stash: false,
        relative: true,
        cwd: innerCwd,
      })
    } catch {} // eslint-disable-line no-empty

    // task received relative `foo.js`
    expect(mockTask).toHaveBeenCalledTimes(1)
    expect(mockTask).toHaveBeenCalledWith(['foo.js'])
    // GitWorkflow received absolute `test/foo.js`
    expect(mockConstructor).toHaveBeenCalledTimes(1)
    expect(expected).toEqual([[normalize(path.join(cwd, 'test/foo.js'))]])
  })
})
