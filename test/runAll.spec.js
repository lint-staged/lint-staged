import makeConsoleMock from 'consolemock'
import execa from 'execa'
import normalize from 'normalize-path'
import path from 'path'

import getStagedFiles from '../lib/getStagedFiles'
import GitWorkflow from '../lib/gitWorkflow'
import resolveGitRepo from '../lib/resolveGitRepo'
import runAll from '../lib/runAll'
import { GitError } from '../lib/symbols'

jest.mock('../lib/file')
jest.mock('../lib/getStagedFiles')
jest.mock('../lib/gitWorkflow')
jest.mock('../lib/resolveGitRepo')

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
    await expect(runAll({ config: {} })).resolves.toEqual(undefined)
  })

  it('should resolve the promise with no files', async () => {
    expect.assertions(1)
    await runAll({ config: { '*.js': ['echo "sample"'] } })
    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      LOG i No staged files found."
    `)
  })

  it('should use an injected logger', async () => {
    expect.assertions(1)
    const logger = makeConsoleMock()
    await runAll({ config: { '*.js': ['echo "sample"'] }, debug: true }, logger)
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      LOG i No staged files found."
    `)
  })

  it('should not skip tasks if there are files', async () => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    await runAll({ config: { '*.js': ['echo "sample"'] } })
    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      INFO ❯ Preparing...
      LOG ✔ Preparing...
      INFO ❯ Running tasks...
      INFO ❯ Running tasks for *.js
      INFO ❯ echo \\"sample\\"
      LOG ✔ echo \\"sample\\"
      LOG ✔ Running tasks for *.js
      LOG ✔ Running tasks...
      INFO ❯ Applying modifications...
      LOG ✔ Applying modifications...
      INFO ❯ Cleaning up...
      LOG ✔ Cleaning up..."
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
      }
    }))

    await expect(
      runAll({ config: { '*.js': ['echo "sample"'] } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      INFO ❯ Preparing...
      ERROR ✖ test
      INFO ❯ Running tasks...
      INFO ❯ Applying modifications...
      INFO ❯ Cleaning up...
      ERROR 
        × lint-staged failed due to a git error.
      ERROR   Any lost modifications can be restored from a git stash:

          > git stash list
          stash@{0}: automatic lint-staged backup
          > git stash apply --index stash@{0}
      "
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
        cmd: 'mock cmd'
      })
    )

    await expect(
      runAll({ config: { '*.js': ['echo "sample"'] } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      INFO ❯ Preparing...
      LOG ✔ Preparing...
      INFO ❯ Running tasks...
      INFO ❯ Running tasks for *.js
      INFO ❯ echo \\"sample\\"
      ERROR ✖ echo \\"sample\\" [1]
      ERROR ✖ echo \\"sample\\" [1]
      LOG ✔ Running tasks...
      INFO ❯ Applying modifications...
      INFO ❯ Reverting to original state because of errors...
      LOG ✔ Reverting to original state because of errors...
      INFO ❯ Cleaning up...
      LOG ✔ Cleaning up..."
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
        cmd: 'mock cmd'
      })
    )

    await expect(
      runAll({ config: { '*.js': ['echo "sample"'] } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

    expect(console.printHistory()).toMatchInlineSnapshot(`
      "
      INFO ❯ Preparing...
      LOG ✔ Preparing...
      INFO ❯ Running tasks...
      INFO ❯ Running tasks for *.js
      INFO ❯ echo \\"sample\\"
      ERROR ✖ echo \\"sample\\" [SIGINT]
      ERROR ✖ echo \\"sample\\" [SIGINT]
      LOG ✔ Running tasks...
      INFO ❯ Applying modifications...
      INFO ❯ Reverting to original state because of errors...
      LOG ✔ Reverting to original state because of errors...
      INFO ❯ Cleaning up...
      LOG ✔ Cleaning up..."
    `)
  })
})
