import dedent from 'dedent'
import mockFn from 'execa'
import logSymbols from 'log-symbols'
import runScript from '../src/runScript'
import resolveGitDir from '../src/resolveGitDir'

jest.mock('execa')
jest.mock('../src/resolveGitDir')

const scripts = {
  test: 'noop',
  test2: 'noop'
}

describe('runScript', () => {
  beforeEach(() => {
    resolveGitDir.mockClear()
    resolveGitDir.mockReturnValue(process.cwd())
  })

  afterEach(() => {
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
    expect(res[0].title).toBe('test')
    expect(res[0].task).toBeInstanceOf(Function)
    const taskPromise = res[0].task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
  })

  it('should work with multiple commands', async () => {
    const res = runScript(['test', 'test2'], ['test.js'], scripts)
    expect(res.length).toBe(2)
    expect(res[0].title).toBe('test')
    expect(res[1].title).toBe('test2')

    let taskPromise = res[0].task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn.mock.calls.length).toEqual(1)
    expect(mockFn.mock.calls[0]).toEqual(['npm', ['run', '--silent', 'test', '--', 'test.js'], {}])
    taskPromise = res[1].task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn.mock.calls.length).toEqual(2)
    expect(mockFn.mock.calls[1]).toEqual(['npm', ['run', '--silent', 'test2', '--', 'test.js'], {}])
  })

  it('should respect chunk size', async () => {
    const res = runScript(['test'], ['test1.js', 'test2.js'], scripts, {
      chunkSize: 1
    })
    const taskPromise = res[0].task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn.mock.calls.length).toEqual(2)
    expect(mockFn.mock.calls[0]).toEqual(['npm', ['run', '--silent', 'test', '--', 'test1.js'], {}])
    expect(mockFn.mock.calls[1]).toEqual(['npm', ['run', '--silent', 'test', '--', 'test2.js'], {}])
  })

  it('should support non npm scripts', async () => {
    const res = runScript(['node --arg=true ./myscript.js', 'git add'], ['test.js'], scripts)
    expect(res.length).toBe(2)
    expect(res[0].title).toBe('node --arg=true ./myscript.js')
    expect(res[1].title).toBe('git add')

    let taskPromise = res[0].task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn.mock.calls.length).toEqual(1)
    expect(mockFn.mock.calls[0][0]).toContain('node')
    expect(mockFn.mock.calls[0][1]).toEqual(['--arg=true', './myscript.js', 'test.js'])

    taskPromise = res[1].task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn.mock.calls.length).toEqual(2)
    expect(mockFn.mock.calls[1][0]).toContain('git')
    expect(mockFn.mock.calls[1][1]).toEqual(['add', 'test.js'])
  })

  it('should pass cwd to execa if gitDir is different than process.cwd for non-npm tasks', async () => {
    resolveGitDir.mockReturnValue('../')
    const res = runScript(['test', 'git add'], ['test.js'], scripts)
    let taskPromise = res[0].task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn.mock.calls.length).toEqual(1)
    expect(mockFn.mock.calls[0]).toEqual(['npm', ['run', '--silent', 'test', '--', 'test.js'], {}])

    taskPromise = res[1].task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn.mock.calls.length).toEqual(2)
    expect(mockFn.mock.calls[1][0]).toMatch(/git$/)
    expect(mockFn.mock.calls[1][1]).toEqual(['add', 'test.js'])
    expect(mockFn.mock.calls[1][2]).toEqual({ cwd: '../' })
  })

  it('should not pass `gitDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
    const res = runScript(['jest'], ['test.js'], scripts, { gitDir: '../' })
    const taskPromise = res[0].task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn.mock.calls.length).toEqual(1)
    expect(mockFn.mock.calls[0]).toEqual(['jest', ['test.js'], {}])
  })

  it('should use --silent in non-verbose mode', async () => {
    const res = runScript('test', ['test.js'], scripts, { verbose: false })
    const taskPromise = res[0].task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn.mock.calls.length).toEqual(1)
    expect(mockFn.mock.calls[0]).toEqual(['npm', ['run', '--silent', 'test', '--', 'test.js'], {}])
  })

  it('should not use --silent in verbose mode', async () => {
    const res = runScript('test', ['test.js'], scripts, { verbose: true })
    const taskPromise = res[0].task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(mockFn.mock.calls.length).toEqual(1)
    expect(mockFn.mock.calls[0]).toEqual(['npm', ['run', 'test', '--', 'test.js'], {}])
  })

  it('should throw error for failed linters', async () => {
    const linterErr = new Error()
    linterErr.stdout = 'Mock error'
    linterErr.stderr = ''
    mockFn.mockImplementationOnce(() => Promise.reject(linterErr))

    const res = runScript('mock-fail-linter', ['test.js'], scripts)
    const taskPromise = res[0].task()
    try {
      await taskPromise
    } catch (err) {
      expect(err.message).toMatch(dedent`
        ${logSymbols.error} mock-fail-linter found some errors. Please fix them and try committing again.
        ${linterErr.stdout}
        ${linterErr.stderr}
      `)
    }
  })
})
