import pMapMock from 'p-map'
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

  it('should respect concurrency', () => {
    pMapMock.mockImplementation(() => Promise.resolve(true))

    const res = runScript(['test'], ['test1.js', 'test2.js'], packageJSON, {
      chunkSize: 1,
      subTaskConcurrency: 1
    })
    res[0].task()
    expect(pMapMock.mock.calls.length).toEqual(1)
    const pMapArgs = pMapMock.mock.calls[0]
    expect(pMapArgs[0]).toEqual([['test1.js'], ['test2.js']])
    expect(pMapArgs[1]).toBeInstanceOf(Function)
    expect(pMapArgs[2]).toEqual({ concurrency: 1 })
  })

  it('should handle unexpected error', async () => {
    pMapMock.mockImplementation(() => Promise.reject(new Error('Unexpected Error')))

    const res = runScript(['test'], ['test.js'], packageJSON)
    try {
      await res[0].task()
    } catch (err) {
      expect(err.message).toMatch(`🚫 test got an unexpected error.
Unexpected Error`)
    }
  })
})
