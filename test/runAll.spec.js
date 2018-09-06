import makeConsoleMock from 'consolemock'
import sgfMock from 'staged-git-files'
import { getConfig } from '../src/getConfig'
import runAll from '../src/runAll'

jest.mock('staged-git-files')
// TODO: Fix tests
jest.mock('execa', () => jest.fn().mockImplementation(() => Promise.resolve(true)))

sgfMock.mockImplementation((params, callback) => {
  callback(null, [])
})
const globalConsoleTemp = global.console

describe('runAll', () => {
  beforeAll(() => {
    global.console = makeConsoleMock()
  })

  beforeEach(() => {
    global.console.clearHistory()
  })

  afterAll(() => {
    global.console = globalConsoleTemp
  })

  it('should throw when invalid config is provided', () => {
    expect(() => runAll({})).toThrowErrorMatchingSnapshot()
    expect(() => runAll()).toThrowErrorMatchingSnapshot()
  })

  it('should not throw when a valid config is provided', () => {
    const config = getConfig({
      concurrent: false
    })
    expect(() => runAll(config)).not.toThrow()
  })

  it('should return a promise', () => {
    expect(runAll(getConfig({}))).toBeInstanceOf(Promise)
  })

  it('should resolve the promise with no tasks', async () => {
    expect.assertions(1)
    const res = await runAll(getConfig({}))

    expect(res).toEqual('No tasks to run.')
  })

  it('should resolve the promise with no files', async () => {
    expect.assertions(1)
    await runAll(getConfig({ linters: { '*.js': ['echo "sample"'] } }))
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should not skip tasks if there are files', async () => {
    expect.assertions(1)
    sgfMock.mockImplementationOnce((params, callback) => {
      callback(null, [{ filename: 'sample.js', status: 'sample' }])
    })
    await runAll(getConfig({ linters: { '*.js': ['echo "sample"'] } }))
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should reject the promise when staged-git-files errors', async () => {
    expect.assertions(1)
    sgfMock.mockImplementationOnce((params, callback) => {
      callback('test', undefined)
    })

    try {
      await runAll(getConfig({}))
    } catch (err) {
      expect(err).toEqual('test')
    }
  })
})
