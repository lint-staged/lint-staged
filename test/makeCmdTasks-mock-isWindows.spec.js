import mockFn from 'execa'
import makeCmdTasks from '../src/makeCmdTasks'

jest.mock('is-windows', () => jest.fn(() => true))

describe('makeCmdTasks', () => {
  it('should respect chunk size', async () => {
    expect.assertions(3)

    const [linter] = makeCmdTasks(['test'], ['test1.js', 'test2.js'], { chunkSize: 1 })
    await linter.task()
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).toHaveBeenCalledWith('test', ['test1.js'], { reject: false })
    expect(mockFn).lastCalledWith('test', ['test2.js'], { reject: false })
  })
})
