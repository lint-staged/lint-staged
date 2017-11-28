import dedent from 'dedent'
import pMapMock from 'p-map'
import logSymbols from 'log-symbols'
import runScript from '../src/runScript'

jest.mock('p-map')

const packageJSON = {
  scripts: {
    test: 'noop',
    test2: 'noop'
  },
  'lint-staged': {}
}

describe('runScript', () => {
  afterEach(() => {
    pMapMock.mockClear()
  })

  it('should respect concurrency', async () => {
    pMapMock.mockImplementation(() => Promise.resolve(true))

    const [linter] = runScript(['test'], ['test1.js', 'test2.js'], packageJSON, {
      chunkSize: 1,
      subTaskConcurrency: 1
    })
    await linter.task()
    const [[, mapper]] = pMapMock.mock.calls
    expect(mapper).toBeInstanceOf(Function)
    expect(pMapMock).toHaveBeenCalledWith([['test1.js'], ['test2.js']], mapper, { concurrency: 1 })
  })

  it('should handle unexpected error', async () => {
    pMapMock.mockImplementation(() => Promise.reject(new Error('Unexpected Error')))

    const [linter] = runScript(['test'], ['test.js'], packageJSON)
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
