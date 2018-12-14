import execa from 'execa'
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

  it('should use right file flag', async () => {
    expect.assertions(2)
    const opts = {
      ...defaultOpts,
      fileFlag: '--files',
      linter: 'ng lint',
      gitDir: '../'
    }
    opts.pathsToLint.push('test2.js')
    const taskFn = resolveTaskFn(opts)

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('ng', ['lint', '--files', 'test.js', '--files', 'test2.js'], {
      fileFlag: '--files',
      reject: false
    })
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
      expect(err.privateMsg).toMatchInlineSnapshot(`
"


× mock-fail-linter found some errors. Please fix them and try committing again.
Mock error"
`)
    }
  })

  it('should throw error for killed processes', async () => {
    expect.assertions(1)
    execa.mockResolvedValueOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: false,
      killed: false,
      signal: 'SIGINT',
      cmd: 'mock cmd'
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, linter: 'mock-killed-linter' })
    try {
      await taskFn()
    } catch (err) {
      expect(err.privateMsg).toMatchInlineSnapshot(`
"


‼ mock-killed-linter was terminated with SIGINT"
`)
    }
  })

  it('should not set hasErrors on context if no error occur', async () => {
    expect.assertions(1)
    const context = {}
    const taskFn = resolveTaskFn({ ...defaultOpts, linter: 'jest', gitDir: '../' })
    await taskFn(context)
    expect(context.hasErrors).toBeUndefined()
  })

  it('should set hasErrors on context to true on error', async () => {
    expect.assertions(1)
    execa.mockResolvedValueOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: true,
      cmd: 'mock cmd'
    })
    const context = {}
    const taskFn = resolveTaskFn({ ...defaultOpts, linter: 'mock-fail-linter' })
    try {
      await taskFn(context)
    } catch (err) {
      expect(context.hasErrors).toEqual(true)
    }
  })
})
