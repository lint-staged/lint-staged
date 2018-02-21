import dedent from 'dedent'
import mockFn from 'execa'
import logSymbols from 'log-symbols'
import runScript from '../src/runScript'
import resolveGitDir from '../src/resolveGitDir'

jest.mock('execa')
jest.mock('../src/resolveGitDir')

resolveGitDir.mockReturnValue(process.cwd())

describe('runScript', () => {
  beforeEach(() => {
    resolveGitDir.mockClear()
    mockFn.mockClear()
  })

  it('should return an array', () => {
    expect(runScript('test', ['test.js'])).toBeInstanceOf(Array)
  })

  it('should throw for non-existend script', () => {
    expect(() => {
      runScript('missing-module', ['test.js'])[0].task()
    }).toThrow()
  })

  it('should work with a single command', async () => {
    expect.assertions(4)
    const res = runScript('test', ['test.js'])
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
    const res = runScript(['test', 'test2'], ['test.js'])
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

  it('should respect chunk size', async () => {
    expect.assertions(3)
    const [linter] = runScript(['test'], ['test1.js', 'test2.js'], {
      chunkSize: 1
    })
    await linter.task()
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).toHaveBeenCalledWith('test', ['test1.js'], { reject: false })
    expect(mockFn).lastCalledWith('test', ['test2.js'], { reject: false })
  })

  it('should support non npm scripts', async () => {
    expect.assertions(7)
    const res = runScript(['node --arg=true ./myscript.js', 'git add'], ['test.js'])
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
    const res = runScript(['test', 'git add'], ['test.js'])
    const [linter1, linter2] = res
    await linter1.task()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).lastCalledWith('test', ['test.js'], { reject: false })

    await linter2.task()
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).lastCalledWith('git', ['add', 'test.js'], { cwd: '../', reject: false })
  })

  it('should not pass `gitDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
    expect.assertions(2)
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    const [linter] = runScript(['jest'], ['test.js'], { reject: false })
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

    const [linter] = runScript('mock-fail-linter', ['test.js'])
    try {
      await linter.task()
    } catch (err) {
      // prettier-ignore
      expect(err.message).toMatch(dedent`
        ${logSymbols.error} mock-fail-linter found some errors. Please fix them and try committing again.
        Mock error
      `)
    }
  })
})
