import makeConsoleMock from 'consolemock'
import sgfMock from 'staged-git-files'
import { getConfig } from '../src/getConfig'
import runAll from '../src/runAll'

jest.mock('staged-git-files')

sgfMock.mockImplementation((params, callback) => {
  callback(null, [])
})

const scripts = { mytask: 'echo "Running task"' }
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
    expect(() => runAll(scripts, {})).toThrowErrorMatchingSnapshot()
    expect(() => runAll(scripts)).toThrowErrorMatchingSnapshot()
  })

  it('should not throw when a valid config is provided', () => {
    const config = getConfig({
      concurrent: false
    })
    expect(() => runAll(scripts, config)).not.toThrow()
  })

  it('should return a promise', () => {
    expect(runAll(scripts, getConfig({}))).toBeInstanceOf(Promise)
  })

  it('should resolve the promise with no tasks', () => {
    expect.assertions(1)
    return expect(runAll(scripts, getConfig({}))).resolves.toEqual('No tasks to run.')
  })

  it('should resolve the promise with no files', async () => {
    await runAll(scripts, getConfig({ linters: { '*.js': ['echo "sample"'] } }))
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should not skip tasks if there are files', async () => {
    sgfMock.mockImplementationOnce((params, callback) => {
      callback(null, [{ filename: 'sample.js', status: 'sample' }])
    })
    await runAll(scripts, getConfig({ linters: { '*.js': ['echo "sample"'] } }))
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should reject the promise when staged-git-files errors', () => {
    sgfMock.mockImplementationOnce((params, callback) => {
      callback('test', undefined)
    })
    expect.assertions(1)
    return expect(runAll(scripts, getConfig({}))).rejects.toEqual('test')
  })
})
