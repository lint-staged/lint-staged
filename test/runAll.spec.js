import makeConsoleMock from 'consolemock'
import normalize from 'normalize-path'

import resolveGitDir from '../src/resolveGitDir'
import getStagedFiles from '../src/getStagedFiles'
import runAll from '../src/runAll'

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
})
