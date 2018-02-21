import dedent from 'dedent'
import pMapMock from 'p-map'
import logSymbols from 'log-symbols'
import runScript from '../src/runScript'

jest.mock('p-map')

describe('runScript', () => {
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

    const [linter] = runScript(['test'], ['test1.js', 'test2.js'], {
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

    const [linter] = runScript(['test'], ['test.js'])
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
