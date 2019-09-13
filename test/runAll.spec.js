import makeConsoleMock from 'consolemock'
import execa from 'execa'
import normalize from 'normalize-path'

import resolveGitDir from '../lib/resolveGitDir'
import getStagedFiles from '../lib/getStagedFiles'
import runAll from '../lib/runAll'

jest.mock('../lib/resolveGitDir')
jest.mock('../lib/getStagedFiles')
jest.mock('../lib/gitWorkflow')

resolveGitDir.mockImplementation(async () => normalize(process.cwd()))
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
    const res = await runAll({ config: {} })
    expect(res).toEqual('No tasks to run.')
  })

  it('should resolve the promise with no files', async () => {
    await runAll({ config: { '*.js': ['echo "sample"'] } })
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should warn if the argument length is longer than what the platform can handle', async () => {
    getStagedFiles.mockImplementationOnce(async () => new Array(100000).fill('sample.js'))

    try {
      await runAll({ config: { '*.js': () => 'echo "sample"' } })
    } catch (err) {
      console.log(err)
    }

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
