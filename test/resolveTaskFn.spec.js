import dedent from 'dedent'
import execa from 'execa'
import logSymbols from 'log-symbols'
import resolveTaskFn from '../src/resolveTaskFn'

const defaultOpts = {
  pathsToLint: ['test.js'],
  chunkSize: 999,
  subTaskConcurrency: 1
}

describe('resolveTaskFn', () => {
  beforeEach(() => {
    execa.mockClear()
  })

  it('should throw for non-existent script', () => {
    expect(() => {
      resolveTaskFn({
        ...defaultOpts,
        linter: 'missing-module'
      })
    }).toThrow()
  })

  it('should support non npm scripts', async () => {
    expect.assertions(2)

    const taskFn = resolveTaskFn({
      ...defaultOpts,
      linter: 'node --arg=true ./myscript.js'
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      reject: false
    })
  })

  it('should print the output with the mode verbose', async () => {
    expect.assertions(3)

    const taskFn = resolveTaskFn({
      ...defaultOpts,
      verboseMode: true,
      linter: 'echo "DEMO"'
    })

    global.console = { log: jest.fn() }
    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('echo', ['DEMO', 'test.js'], {
      reject: false
    })
    expect(console.log).toBeCalledWith('a-ok')
  })

  it('should not print the output without the mode verbose', async () => {
    expect.assertions(3)

    const taskFn = resolveTaskFn({
      ...defaultOpts,
      linter: 'echo "DEMO"'
    })

    global.console = { log: jest.fn() }
    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('echo', ['DEMO', 'test.js'], {
      reject: false
    })
    expect(console.log).not.toBeCalledWith('a-ok')
  })

  it('should pass `gitDir` as `cwd` to `execa()` gitDir !== process.cwd for git commands', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      linter: 'git add',
      gitDir: '../'
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('git', ['add', 'test.js'], {
      cwd: '../',
      reject: false
    })
  })

  it('should not pass `gitDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({ ...defaultOpts, linter: 'jest', gitDir: '../' })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('jest', ['test.js'], { reject: false })
  })

  it('should throw error for failed linters', async () => {
    expect.assertions(1)
    execa.mockResolvedValueOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: true,
      cmd: 'mock cmd'
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, linter: 'mock-fail-linter' })
    try {
      await taskFn()
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
