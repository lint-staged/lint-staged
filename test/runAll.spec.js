import makeConsoleMock from 'consolemock'
import execa from 'execa'
import normalize from 'normalize-path'

import resolveGitDir from '../src/resolveGitDir'
import getStagedFiles from '../src/getStagedFiles'
import runAll from '../src/runAll'
import { hasPartiallyStagedFiles, gitStashSave, gitStashPop, updateStash } from '../src/gitWorkflow'

jest.mock('../src/resolveGitDir')
jest.mock('../src/getStagedFiles')
jest.mock('../src/gitWorkflow')

resolveGitDir.mockImplementation(async () => normalize(process.cwd()))
getStagedFiles.mockImplementation(async () => [])

const globalConsoleTemp = console

describe('runAll', () => {
  beforeAll(() => {
    console = makeConsoleMock()
  })

  afterEach(() => {
    console.clearHistory()
    gitStashSave.mockClear()
    gitStashPop.mockClear()
    updateStash.mockClear()
  })

  afterAll(() => {
    console = globalConsoleTemp
  })

  it('should not throw when a valid config is provided', () => {
    expect(() => runAll({})).not.toThrow()
  })

  it('should return a promise', () => {
    expect(runAll({})).toBeInstanceOf(Promise)
  })

  it('should resolve the promise with no tasks', async () => {
    expect.assertions(1)
    const res = await runAll({ config: {} })

    expect(res).toEqual('No tasks to run.')
  })

  it('should resolve the promise with no files', async () => {
    expect.assertions(1)
    await runAll({ config: { '*.js': ['echo "sample"'] } })
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should use an injected logger', async () => {
    expect.assertions(1)
    const logger = makeConsoleMock()
    await runAll({ config: { '*.js': ['echo "sample"'] }, debug: true }, logger)
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should not skip tasks if there are files', async () => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    await runAll({ config: { '*.js': ['echo "sample"'] } })
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should not skip stashing and restoring if there are partially staged files', async () => {
    expect.assertions(4)
    hasPartiallyStagedFiles.mockImplementationOnce(() => Promise.resolve(true))
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    await runAll({ config: { '*.js': ['echo "sample"'] } })
    expect(gitStashSave).toHaveBeenCalledTimes(1)
    expect(updateStash).toHaveBeenCalledTimes(1)
    expect(gitStashPop).toHaveBeenCalledTimes(1)
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should skip stashing and restoring if there are no partially staged files', async () => {
    expect.assertions(4)
    hasPartiallyStagedFiles.mockImplementationOnce(() => Promise.resolve(false))
    getStagedFiles.mockImplementationOnce(async () => ['sample.js'])
    await runAll({ config: { '*.js': ['echo "sample"'] } })
    expect(gitStashSave).toHaveBeenCalledTimes(0)
    expect(updateStash).toHaveBeenCalledTimes(0)
    expect(gitStashPop).toHaveBeenCalledTimes(0)
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should skip updating stash if there are errors during linting', async () => {
    expect.assertions(4)
    hasPartiallyStagedFiles.mockImplementationOnce(() => Promise.resolve(true))
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

    try {
      await runAll({ config: { '*.js': ['echo "sample"'] } })
    } catch (err) {
      console.log(err)
    }
    expect(console.printHistory()).toMatchSnapshot()
    expect(gitStashSave).toHaveBeenCalledTimes(1)
    expect(updateStash).toHaveBeenCalledTimes(0)
    expect(gitStashPop).toHaveBeenCalledTimes(1)
  })

  it('should warn if the argument length is longer than what the platform can handle', async () => {
    hasPartiallyStagedFiles.mockImplementationOnce(() => Promise.resolve(false))
    getStagedFiles.mockImplementationOnce(async () => new Array(100000).fill('sample.js'))

    try {
      await runAll({ config: { '*.js': () => 'echo "sample"' } })
    } catch (err) {
      console.log(err)
    }
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should skip linters and stash update but perform working copy restore if terminated', async () => {
    expect.assertions(4)
    hasPartiallyStagedFiles.mockImplementationOnce(() => Promise.resolve(true))
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

    try {
      await runAll({ config: { '*.js': ['echo "sample"'] } })
    } catch (err) {
      console.log(err)
    }
    expect(console.printHistory()).toMatchSnapshot()
    expect(gitStashSave).toHaveBeenCalledTimes(1)
    expect(updateStash).toHaveBeenCalledTimes(0)
    expect(gitStashPop).toHaveBeenCalledTimes(1)
  })

  it('should reject promise when error during getStagedFiles', async () => {
    expect.assertions(1)
    getStagedFiles.mockImplementationOnce(async () => null)
    await expect(runAll({})).rejects.toThrowErrorMatchingSnapshot()
  })

  it('should skip stashing changes if no lint-staged files are changed', async () => {
    expect.assertions(4)
    hasPartiallyStagedFiles.mockImplementationOnce(() => Promise.resolve(true))
    getStagedFiles.mockImplementationOnce(async () => ['sample.java'])
    execa.mockImplementationOnce(() =>
      Promise.resolve({
        stdout: '',
        stderr: 'Linter finished with error',
        code: 1,
        failed: true,
        cmd: 'mock cmd'
      })
    )

    try {
      await runAll({ config: { '*.js': ['echo "sample"'] } })
    } catch (err) {
      console.log(err)
    }
    expect(console.printHistory()).toMatchSnapshot()
    expect(gitStashSave).toHaveBeenCalledTimes(0)
    expect(updateStash).toHaveBeenCalledTimes(0)
    expect(gitStashPop).toHaveBeenCalledTimes(0)
  })
})
