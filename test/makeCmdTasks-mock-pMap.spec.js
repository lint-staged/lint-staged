import dedent from 'dedent'
import pMapMock from 'p-map'
import logSymbols from 'log-symbols'
import makeCmdTasks from '../src/makeCmdTasks'

jest.mock('is-windows', () => jest.fn(() => true))
jest.mock('p-map')

describe('makeCmdTasks', () => {
  afterEach(() => {
    pMapMock.mockClear()
  })

  it('should respect concurrency', async () => {
    expect.assertions(2)
    pMapMock.mockImplementation(() =>
      Promise.resolve([
        {
          stdout: 'a-ok',
          stderr: '',
          code: 0,
          failed: false,
          cmd: 'mock cmd'
        }
      ])
    )

    const [linter] = makeCmdTasks(['test'], ['test1.js', 'test2.js'], {
      chunkSize: 1,
      subTaskConcurrency: 1
    })
    await linter.task()
    const [[, mapper]] = pMapMock.mock.calls
    expect(mapper).toBeInstanceOf(Function)
    expect(pMapMock).toHaveBeenCalledWith([['test1.js'], ['test2.js']], mapper, { concurrency: 1 })
  })

  it('should handle unexpected error', async () => {
    expect.assertions(1)
    pMapMock.mockImplementation(() => Promise.reject(new Error('Unexpected Error')))

    const [linter] = makeCmdTasks(['test'], ['test.js'])
    try {
      await linter.task()
    } catch (err) {
      expect(err.message).toMatch(dedent`
        ${logSymbols.error} test got an unexpected error.
        Unexpected Error
      `)
    }
  })
})
