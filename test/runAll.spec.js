import makeConsoleMock from 'consolemock'
import execa from 'execa'
import normalize from 'normalize-path'
import path from 'path'

import resolveGitRepo from '../lib/resolveGitRepo'
import getStagedFiles from '../lib/getStagedFiles'
import runAll, { shouldSkip } from '../lib/runAll'

jest.mock('../lib/resolveGitRepo')
jest.mock('../lib/getStagedFiles')
jest.mock('../lib/gitWorkflow')

resolveGitRepo.mockImplementation(async () => {
  const cwd = process.cwd()
  return { gitConfigDir: normalize(path.resolve(cwd, '.git')), gitDir: normalize(cwd) }
})
getStagedFiles.mockImplementation(async () => [])

const globalConsoleTemp = console

describe('runAll', () => {
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
    await expect(runAll({ config: {} })).resolves
  })

  it('should resolve the promise with no files', async () => {
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

  it('should skip applying unstaged modifications if there are errors during linting', async () => {
    expect.assertions(1)
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
  })

  it('should skip tasks and restore state if terminated', async () => {
    expect.assertions(1)
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
  })
})

describe('shouldSkip', () => {
  describe('shouldSkipRevert', () => {
    it('should return error message when there is an unkown git error', () => {
      const result = shouldSkip.shouldSkipRevert({ gitError: true })
      expect(typeof result === 'string').toEqual(true)
    })
  })

  describe('shouldSkipCleanup', () => {
    it('should return error message when reverting to original state fails', () => {
      const result = shouldSkip.shouldSkipCleanup({ gitRestoreOriginalStateError: true })
      expect(typeof result === 'string').toEqual(true)
    })
  })
})
