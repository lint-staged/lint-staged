import execa from 'execa'

import resolveTaskFn from '../lib/resolveTaskFn'
import { TaskError } from '../lib/symbols'

const defaultOpts = { files: ['test.js'] }

const defaultCtx = { errors: new Set() }

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

    await taskFn(defaultCtx)
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
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

    await taskFn(defaultCtx)
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
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

    await taskFn(defaultCtx)
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

    await taskFn(defaultCtx)
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
      command: 'git diff',
      gitDir: '../'
    })

    await taskFn(defaultCtx)
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('git', ['diff', 'test.js'], {
      cwd: '../',
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should not pass `gitDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', gitDir: '../' })

    await taskFn(defaultCtx)
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('jest', ['test.js'], {
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should always pass `process.cwd()` as `cwd` to `execa()` when relative = true', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'git diff',
      relative: true
    })

    await taskFn(defaultCtx)
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('git', ['diff', 'test.js'], {
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
    await expect(taskFn(defaultCtx)).rejects.toThrow('mock-fail-linter found some errors')
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
    await expect(taskFn(defaultCtx)).rejects.toThrow(
      'mock-killed-linter was terminated with SIGINT'
    )
  })

  it('should not add TaskError if no error occur', async () => {
    expect.assertions(1)
    const context = { errors: new Set() }
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', gitDir: '../' })
    await taskFn(context)
    expect(context.errors.has(TaskError)).toEqual(false)
  })

  it('should add TaskError on error', async () => {
    execa.mockResolvedValueOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: true,
      cmd: 'mock cmd'
    })
    const context = { errors: new Set() }
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-fail-linter' })
    expect.assertions(2)
    await expect(taskFn(context)).rejects.toThrow('mock-fail-linter found some errors')
    expect(context.errors.has(TaskError)).toEqual(true)
  })
})
