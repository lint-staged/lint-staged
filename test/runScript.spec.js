import dedent from 'dedent'
import mockFn from 'execa'
import logSymbols from 'log-symbols'
import runScript from '../src/runScript'
import resolveGitDir from '../src/resolveGitDir'

jest.mock('execa')
jest.mock('../src/resolveGitDir')

resolveGitDir.mockReturnValue(process.cwd())

const scripts = {
  test: 'noop',
  test2: 'noop'
}

describe('runScript', () => {
  beforeEach(() => {
    resolveGitDir.mockClear()
    mockFn.mockClear()
  })

  it('should return an array', () => {
    expect(runScript('test', ['test.js'], scripts)).toBeInstanceOf(Array)
  })

  it('should throw for non-existend script', () => {
    expect(() => {
      runScript('missing-module', ['test.js'], scripts)[0].task()
    }).toThrow()
  })

  it('should work with a single command', async () => {
    const res = runScript('test', ['test.js'], scripts)
    expect(res.length).toBe(1)
    const [linter] = res
    expect(linter.title).toBe('test')
    expect(linter.task).toBeInstanceOf(Function)
    const taskPromise = linter.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
  })

  it('should work with multiple commands', async () => {
    const res = runScript(['test', 'test2'], ['test.js'], scripts)
    expect(res.length).toBe(2)
    const [linter1, linter2] = res
    expect(linter1.title).toBe('test')
    expect(linter2.title).toBe('test2')

    let taskPromise = linter1.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).lastCalledWith('npm', ['run', '--silent', 'test', '--', 'test.js'], {})
    taskPromise = linter2.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).lastCalledWith('npm', ['run', '--silent', 'test2', '--', 'test.js'], {})
  })

  it('should respect chunk size', async () => {
    const [linter] = runScript(['test'], ['test1.js', 'test2.js'], scripts, {
      chunkSize: 1
    })
    await linter.task()
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).toHaveBeenCalledWith('npm', ['run', '--silent', 'test', '--', 'test1.js'], {})
    expect(mockFn).lastCalledWith('npm', ['run', '--silent', 'test', '--', 'test2.js'], {})
  })

  it('should support non npm scripts', async () => {
    const res = runScript(['node --arg=true ./myscript.js', 'git add'], ['test.js'], scripts)
    expect(res.length).toBe(2)
    const [linter1, linter2] = res
    expect(linter1.title).toBe('node --arg=true ./myscript.js')
    expect(linter2.title).toBe('git add')

    await linter1.task()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {})

    await linter2.task()
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).lastCalledWith('git', ['add', 'test.js'], {})
  })

  it('should pass cwd to execa if gitDir is different than process.cwd for non-npm tasks', async () => {
    resolveGitDir.mockReturnValueOnce('../')
    const res = runScript(['test', 'git add'], ['test.js'], scripts)
    const [linter1, linter2] = res
    await linter1.task()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).lastCalledWith('npm', ['run', '--silent', 'test', '--', 'test.js'], {})

    await linter2.task()
    expect(mockFn).toHaveBeenCalledTimes(2)
    expect(mockFn).lastCalledWith('git', ['add', 'test.js'], { cwd: '../' })
  })

  it('should not pass `gitDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    const [linter] = runScript(['jest'], ['test.js'], scripts, {})
    await linter.task()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).lastCalledWith('jest', ['test.js'], {})
    process.cwd = processCwdBkp
  })

  it('should use --silent in normal mode', async () => {
    const [linter] = runScript('test', ['test.js'], scripts, {}, false)
    await linter.task()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).lastCalledWith('npm', ['run', '--silent', 'test', '--', 'test.js'], {})
  })

  it('should not use --silent in debug mode', async () => {
    const [linter] = runScript('test', ['test.js'], scripts, {}, true)
    await linter.task()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).lastCalledWith('npm', ['run', 'test', '--', 'test.js'], {})
  })

  it('should throw error for failed linters', async () => {
    const linterErr = new Error()
    linterErr.stdout = 'Mock error'
    linterErr.stderr = ''
    mockFn.mockImplementationOnce(() => Promise.reject(linterErr))

    const [linter] = runScript('mock-fail-linter', ['test.js'], scripts)
    try {
      await linter.task()
    } catch (err) {
      // prettier-ignore
      expect(err.message).toMatch(dedent`
        ${logSymbols.error} mock-fail-linter found some errors. Please fix them and try committing again.
        ${linterErr.stdout}
        ${linterErr.stderr}
      `)
    }
  })
})
