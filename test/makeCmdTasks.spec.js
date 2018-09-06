import execa from 'execa'
import makeCmdTasks from '../src/makeCmdTasks'

jest.mock('execa', () =>
  jest.fn(() =>
    Promise.resolve({
      stdout: 'a-ok',
      stderr: '',
      code: 0,
      failed: false,
      cmd: 'mock cmd'
    })
  )
)

describe('makeCmdTasks', () => {
  beforeEach(() => {
    execa.mockClear()
  })

  it('should return an array', () => {
    expect(makeCmdTasks('test', ['test.js'])).toBeInstanceOf(Array)
  })

  it('should work with a single command', async () => {
    expect.assertions(4)
    const res = makeCmdTasks('test', ['test.js'])
    expect(res.length).toBe(1)
    const [linter] = res
    expect(linter.title).toBe('test')
    expect(linter.task).toBeInstanceOf(Function)
    const taskPromise = linter.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
  })

  it('should work with multiple commands', async () => {
    expect.assertions(9)
    const res = makeCmdTasks(['test', 'test2'], ['test.js'])
    expect(res.length).toBe(2)
    const [linter1, linter2] = res
    expect(linter1.title).toBe('test')
    expect(linter2.title).toBe('test2')

    let taskPromise = linter1.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('test', ['test.js'], { reject: false })
    taskPromise = linter2.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(execa).toHaveBeenCalledTimes(2)
    expect(execa).lastCalledWith('test2', ['test.js'], { reject: false })
  })
})
