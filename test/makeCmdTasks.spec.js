import dedent from 'dedent'
import mockFn from 'execa'
import logSymbols from 'log-symbols'
import makeCmdTasks from '../src/makeCmdTasks'
import resolveGitDir from '../src/resolveGitDir'

jest.mock('../src/resolveGitDir')

resolveGitDir.mockReturnValue(process.cwd())

describe('makeCmdTasks', () => {
  beforeEach(() => {
    resolveGitDir.mockClear()
    mockFn.mockClear()
  })

  it('should return an array', () => {
    expect(makeCmdTasks('test', ['test.js'])).toBeInstanceOf(Array)
  })

  it('should throw for non-existent script', () => {
    expect(() => {
      makeCmdTasks('missing-module', ['test.js'])[0].task()
    }).toThrow()
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
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).lastCalledWith('test', ['test.js'], { reject: false })
    taskPromise = linter2.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).lastCalledWith('test2', ['test.js'], { reject: false })
  })

  it('should support non npm scripts', async () => {
    expect.assertions(7)
    const res = makeCmdTasks(['node --arg=true ./myscript.js', 'git add'], ['test.js'])
    expect(res.length).toBe(2)
    const [linter1, linter2] = res
    expect(linter1.title).toBe('node --arg=true ./myscript.js')
    expect(linter2.title).toBe('git add')

    await linter1.task()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      reject: false
    })

    await linter2.task()
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).lastCalledWith('git', ['add', 'test.js'], { reject: false })
  })

  it('should pass cwd to execa if gitDir is different than process.cwd for non-npm tasks', async () => {
    expect.assertions(4)
    resolveGitDir.mockReturnValueOnce('../')
    const res = makeCmdTasks(['test', 'git add'], ['test.js'])
    const [linter1, linter2] = res
    await linter1.task()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).lastCalledWith('test', ['test.js'], { reject: false })

    await linter2.task()
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).lastCalledWith('git', ['add', 'test.js'], {
      cwd: '../',
      reject: false
    })
  })

  it('should not pass `gitDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
    expect.assertions(2)
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    const [linter] = makeCmdTasks(['jest'], ['test.js'], { reject: false })
    await linter.task()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).lastCalledWith('jest', ['test.js'], { reject: false })
    process.cwd = processCwdBkp
  })

  it('should throw error for failed linters', async () => {
    expect.assertions(1)
    mockFn.mockImplementationOnce(() =>
      Promise.resolve({
        stdout: 'Mock error',
        stderr: '',
        code: 0,
        failed: true,
        cmd: 'mock cmd'
      })
    )

    const [linter] = makeCmdTasks('mock-fail-linter', ['test.js'])
    try {
      await linter.task()
    } catch (err) {
      expect(err.privateMsg).toMatch(dedent`
        ${
          logSymbols.error
        } "mock-fail-linter" found some errors. Please fix them and try committing again.
        Mock error
      `)
    }
  })
})
