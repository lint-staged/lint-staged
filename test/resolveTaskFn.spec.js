import execa from 'execa'
import resolveTaskFn from '../src/resolveTaskFn'

const defaultOpts = { files: ['test.js'] }

describe('resolveTaskFn', () => {
  beforeEach(() => {
    execa.mockClear()
  })

  it('should support non npm scripts', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'node --arg=true ./myscript.js'
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node --arg=true ./myscript.js test.js', {
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should not append pathsToLint when isFn', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      isFn: true,
      command: 'node --arg=true ./myscript.js test.js'
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node --arg=true ./myscript.js test.js', {
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should not append pathsToLint when isFn and shell', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      isFn: true,
      shell: true,
      command: 'node --arg=true ./myscript.js test.js'
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node --arg=true ./myscript.js test.js', {
      preferLocal: true,
      reject: false,
      shell: true
    })
  })

  it('should work with shell', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      shell: true,
      command: 'node --arg=true ./myscript.js'
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node --arg=true ./myscript.js test.js', {
      preferLocal: true,
      reject: false,
      shell: true
    })
  })

  it('should pass `gitDir` as `cwd` to `execa()` gitDir !== process.cwd for git commands', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'git add',
      gitDir: '../'
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('git add test.js', {
      cwd: '../',
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should not pass `gitDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', gitDir: '../' })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('jest test.js', {
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should always pass `process.cwd()` as `cwd` to `execa()` when relative = true', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'git add',
      relative: true
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('git add test.js', {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false
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

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-fail-linter' })
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

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-killed-linter' })
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
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', gitDir: '../' })
    await taskFn(context)
    expect(context.hasErrors).toBeUndefined()
  })

  it('should set hasErrors on context to true on error', async () => {
    execa.mockResolvedValueOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: true,
      cmd: 'mock cmd'
    })
    const context = {}
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-fail-linter' })
    expect.assertions(1)
    try {
      await taskFn(context)
    } catch (err) {
      expect(context.hasErrors).toEqual(true)
    }
  })
})
