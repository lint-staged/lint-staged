import makeConsoleMock from 'consolemock'
import sgfMock from 'staged-git-files'
import execa from 'execa'
import { getConfig } from '../src/getConfig'
import runAll from '../src/runAll'
import { saveStagedFiles, restoreStagedFiles, clearStagedFileStash } from '../src/gitWorkflow'

jest.mock('staged-git-files')
jest.mock('../src/gitWorkflow')

sgfMock.mockImplementation((params, callback) => {
  callback(null, [])
})
const globalConsoleTemp = global.console

describe('runAll', () => {
  beforeAll(() => {
    global.console = makeConsoleMock()
  })

  afterEach(() => {
    global.console.clearHistory()
    saveStagedFiles.mockClear()
    restoreStagedFiles.mockClear()
    clearStagedFileStash.mockClear()
  })

  afterAll(() => {
    global.console = globalConsoleTemp
  })

  it('should throw when invalid config is provided', async () => {
    await expect(runAll({})).rejects.toThrowErrorMatchingSnapshot()
    await expect(runAll()).rejects.toThrowErrorMatchingSnapshot()
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

  it('should not skip stashing and restoring if there are partially staged files', async () => {
    expect.assertions(4)
    sgfMock.mockImplementationOnce((params, callback) => {
      callback(null, [{ filename: 'sample.js', status: 'Modified' }])
    })
    await runAll(getConfig({ linters: { '*.js': ['echo "sample"'] } }))
    expect(saveStagedFiles).toHaveBeenCalledTimes(1)
    expect(restoreStagedFiles).toHaveBeenCalledTimes(0)
    expect(clearStagedFileStash).toHaveBeenCalledTimes(1)
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should skip updating stash if there are errors during linting', async () => {
    expect.assertions(3)
    sgfMock.mockImplementationOnce((params, callback) => {
      callback(null, [{ filename: 'sample.js', status: 'Modified' }])
    })
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
      await runAll(getConfig({ linters: { '*.js': ['echo "sample"'] } }))
    } catch (err) {
      console.log(err)
    }
    expect(console.printHistory()).toMatchSnapshot()
    expect(saveStagedFiles).toHaveBeenCalledTimes(1)
    expect(restoreStagedFiles).toHaveBeenCalledTimes(1)
  })

  it('should skip linters and stash update but perform working copy restore if terminated', async () => {
    expect.assertions(3)
    sgfMock.mockImplementationOnce((params, callback) => {
      callback(null, [{ filename: 'sample.js', status: 'Modified' }])
    })
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
      await runAll(getConfig({ linters: { '*.js': ['echo "sample"'] } }))
    } catch (err) {
      console.log(err)
    }
    expect(console.printHistory()).toMatchSnapshot()
    expect(saveStagedFiles).toHaveBeenCalledTimes(1)
    expect(restoreStagedFiles).toHaveBeenCalledTimes(1)
  })

  it('should reject promise when staged-git-files errors', async () => {
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

  it('should skip stashing changes if no lint-staged files are changed', async () => {
    expect.assertions(3)
    sgfMock.mockImplementationOnce((params, callback) => {
      callback(null, [{ filename: 'sample.java', status: 'Modified' }])
    })
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
      await runAll(getConfig({ linters: { '*.js': ['echo "sample"'] } }))
    } catch (err) {
      console.log(err)
    }
    expect(console.printHistory()).toMatchSnapshot()
    expect(saveStagedFiles).toHaveBeenCalledTimes(0)
    expect(restoreStagedFiles).toHaveBeenCalledTimes(0)
  })
})
