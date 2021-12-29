import path from 'path'

import makeConsoleMock from 'consolemock'
import execa from 'execa'
import normalize from 'normalize-path'

import { getStagedFiles } from '../lib/getStagedFiles'
import { GitWorkflow } from '../lib/gitWorkflow'
import { resolveGitRepo } from '../lib/resolveGitRepo'
import { runAll } from '../lib/runAll'
import { GitError } from '../lib/symbols'
import { loadConfig } from '../lib/loadConfig'

jest.mock('../lib/file')
jest.mock('../lib/getStagedFiles')
jest.mock('../lib/gitWorkflow')
jest.mock('../lib/resolveGitRepo')
jest.mock('../lib/loadConfig')

getStagedFiles.mockImplementation(async () => [])

resolveGitRepo.mockImplementation(async () => {
  const cwd = process.cwd()
  return { gitConfigDir: normalize(path.resolve(cwd, '.git')), gitDir: normalize(cwd) }
})

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
    await expect(runAll({ config: {} })).resolves.toMatchInlineSnapshot(`
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
    await expect(runAll({ config: {}, quiet: true })).resolves.toMatchInlineSnapshot(`
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
    await runAll({ config: { '*.js': ['echo "sample"'] } })
    expect(console.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should use an injected logger', async () => {
    expect.assertions(1)
    const logger = makeConsoleMock()
    await runAll({ config: { '*.js': ['echo "sample"'] }, debug: true }, logger)
    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should exit without output when no staged files match configured tasks and quiet', async () => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    await runAll({ config: { '*.css': ['echo "sample"'] }, quiet: true })
    expect(console.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should not skip tasks if there are files', async () => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    await runAll({ config: { '*.js': ['echo "sample"'] } })
    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG [STARTED] Preparing...
      LOG [SUCCESS] Preparing...
      LOG [STARTED] Running tasks...
      LOG [STARTED] Running tasks for *.js
      LOG [STARTED] echo \\"sample\\"
      LOG [SUCCESS] echo \\"sample\\"
      LOG [SUCCESS] Running tasks for *.js
      LOG [SUCCESS] Running tasks...
      LOG [STARTED] Applying modifications...
      LOG [SUCCESS] Applying modifications...
      LOG [STARTED] Cleaning up...
      LOG [SUCCESS] Cleaning up..."
    `)
  })

  describe('sparseConfig', () => {
    const mockTaskForPackageA = jest.fn(() => ['echo "package A"'])
    const mockTaskForPackageB = jest.fn(() => ['echo "package B"'])
    beforeAll(() => {
      loadConfig.mockImplementation((params) => {
        const { searchStartPath } = params
        const actualLoadConfig = jest.requireActual('../lib/loadConfig').loadConfig
        if (searchStartPath) {
          if (searchStartPath.endsWith(path.join('package/a'))) {
            return {
              config: {
                '*.js': mockTaskForPackageA,
              },
              filepath: path.join(searchStartPath, 'package.json'),
            }
          }
          if (searchStartPath.endsWith(path.join('package/b'))) {
            return {
              config: {
                '*.js': mockTaskForPackageB,
              },
              filepath: path.join(searchStartPath, 'package.json'),
            }
          }
        }
        return actualLoadConfig(params)
      })
    })

    afterEach(() => {
      mockTaskForPackageA.mockClear()
      mockTaskForPackageB.mockClear()
    })

    afterAll(() => {
      loadConfig.mockReset()
    })

    it('should work with sparseConfig', async () => {
      expect.assertions(5)
      getStagedFiles.mockImplementationOnce(async () => ['package/a/foo.js', 'package/b/bar.js'])

      await runAll({ sparseConfig: true })

      expect(mockTaskForPackageA).toHaveBeenCalledTimes(1)
      expect(mockTaskForPackageA).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('package/a/foo.js')])
      )
      expect(mockTaskForPackageB).toHaveBeenCalledTimes(1)
      expect(mockTaskForPackageB).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('package/b/bar.js')])
      )
      expect(console.printHistory()).toMatchInlineSnapshot(`
        "
        LOG [STARTED] Preparing...
        LOG [SUCCESS] Preparing...
        LOG [STARTED] Running tasks...
        LOG [STARTED] Running tasks for *.js under package/a
        LOG [STARTED] echo \\"package A\\"
        LOG [SUCCESS] echo \\"package A\\"
        LOG [SUCCESS] Running tasks for *.js under package/a
        LOG [SUCCESS] Running tasks...
        LOG [STARTED] Running tasks...
        LOG [STARTED] Running tasks for *.js under package/b
        LOG [STARTED] echo \\"package B\\"
        LOG [SUCCESS] echo \\"package B\\"
        LOG [SUCCESS] Running tasks for *.js under package/b
        LOG [SUCCESS] Running tasks...
        LOG [STARTED] Applying modifications...
        LOG [SUCCESS] Applying modifications...
        LOG [STARTED] Cleaning up...
        LOG [SUCCESS] Cleaning up..."
      `)
    })
    it('should work with maxArgLength', async () => {
      expect.assertions(1)
      getStagedFiles.mockImplementationOnce(async () => [
        'package/a/1.js',
        'package/a/2.js',
        'package/b/1.js',
        'package/b/2.js',
      ])
      await runAll({ sparseConfig: true, maxArgLength: 1 })

      expect(console.printHistory()).toMatchInlineSnapshot(`
        "
        LOG [STARTED] Preparing...
        LOG [SUCCESS] Preparing...
        LOG [STARTED] Running tasks (chunk 1/2)...
        LOG [STARTED] Running tasks for *.js under package/a
        LOG [STARTED] echo \\"package A\\"
        LOG [SUCCESS] echo \\"package A\\"
        LOG [SUCCESS] Running tasks for *.js under package/a
        LOG [SUCCESS] Running tasks (chunk 1/2)...
        LOG [STARTED] Running tasks (chunk 2/2)...
        LOG [STARTED] Running tasks for *.js under package/a
        LOG [STARTED] echo \\"package A\\"
        LOG [SUCCESS] echo \\"package A\\"
        LOG [SUCCESS] Running tasks for *.js under package/a
        LOG [SUCCESS] Running tasks (chunk 2/2)...
        LOG [STARTED] Running tasks (chunk 1/2)...
        LOG [STARTED] Running tasks for *.js under package/b
        LOG [STARTED] echo \\"package B\\"
        LOG [SUCCESS] echo \\"package B\\"
        LOG [SUCCESS] Running tasks for *.js under package/b
        LOG [SUCCESS] Running tasks (chunk 1/2)...
        LOG [STARTED] Running tasks (chunk 2/2)...
        LOG [STARTED] Running tasks for *.js under package/b
        LOG [STARTED] echo \\"package B\\"
        LOG [SUCCESS] echo \\"package B\\"
        LOG [SUCCESS] Running tasks for *.js under package/b
        LOG [SUCCESS] Running tasks (chunk 2/2)...
        LOG [STARTED] Applying modifications...
        LOG [SUCCESS] Applying modifications...
        LOG [STARTED] Cleaning up...
        LOG [SUCCESS] Cleaning up..."
      `)
    })
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
      runAll({ config: { '*.js': ['echo "sample"'] } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG [STARTED] Preparing...
      ERROR [FAILED] test
      LOG [STARTED] Running tasks...
      INFO [SKIPPED] Skipped because of previous git error.
      LOG [STARTED] Applying modifications...
      INFO [SKIPPED] 
      [SKIPPED]   ✖ lint-staged failed due to a git error.
      LOG [STARTED] Cleaning up...
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
      runAll({ config: { '*.js': ['echo "sample"'] } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG [STARTED] Preparing...
      LOG [SUCCESS] Preparing...
      LOG [STARTED] Running tasks...
      LOG [STARTED] Running tasks for *.js
      LOG [STARTED] echo \\"sample\\"
      ERROR [FAILED] echo \\"sample\\" [1]
      LOG [SUCCESS] Running tasks...
      LOG [STARTED] Applying modifications...
      INFO [SKIPPED] Skipped because of errors from tasks.
      LOG [STARTED] Reverting to original state because of errors...
      LOG [SUCCESS] Reverting to original state because of errors...
      LOG [STARTED] Cleaning up...
      LOG [SUCCESS] Cleaning up..."
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
      runAll({ config: { '*.js': ['echo "sample"'] } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG [STARTED] Preparing...
      LOG [SUCCESS] Preparing...
      LOG [STARTED] Running tasks...
      LOG [STARTED] Running tasks for *.js
      LOG [STARTED] echo \\"sample\\"
      ERROR [FAILED] echo \\"sample\\" [SIGINT]
      LOG [SUCCESS] Running tasks...
      LOG [STARTED] Applying modifications...
      INFO [SKIPPED] Skipped because of errors from tasks.
      LOG [STARTED] Reverting to original state because of errors...
      LOG [SUCCESS] Reverting to original state because of errors...
      LOG [STARTED] Cleaning up...
      LOG [SUCCESS] Cleaning up..."
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
      await runAll({ config: { '*.js': mockTask }, stash: false, relative: true, cwd: innerCwd })
    } catch {} // eslint-disable-line no-empty

    // task received relative `foo.js`
    expect(mockTask).toHaveBeenCalledTimes(1)
    expect(mockTask).toHaveBeenCalledWith(['foo.js'])
    // GitWorkflow received absolute `test/foo.js`
    expect(mockConstructor).toHaveBeenCalledTimes(1)
    expect(expected).toEqual([[normalize(path.join(cwd, 'test/foo.js'))]])
  })
})
