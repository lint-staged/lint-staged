import { execa, execaCommand } from 'execa'
import pidTree from 'pidtree'

import { resolveTaskFn } from '../../lib/resolveTaskFn.js'
import { getInitialState } from '../../lib/state.js'
import { TaskError } from '../../lib/symbols.js'

import { mockExecaReturnValue } from './__utils__/mockExecaReturnValue.js'

jest.useFakeTimers()

jest.mock('execa', () => ({
  execa: jest.fn(() => mockExecaReturnValue()),
  execaCommand: jest.fn(() => mockExecaReturnValue()),
}))

jest.mock('pidtree', () => jest.fn(async () => []))

const defaultOpts = { files: ['test.js'] }

const mockExecaImplementationOnce = (value) => {
  execa.mockImplementationOnce(() => mockExecaReturnValue(value))
  execaCommand.mockImplementationOnce(() => mockExecaReturnValue(value))
}

describe('resolveTaskFn', () => {
  beforeEach(() => {
    execa.mockClear()
    execaCommand.mockClear()
  })

  it('should support non npm scripts', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'node --arg=true ./myscript.js',
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
    })
  })

  it('should not append pathsToLint when isFn', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      isFn: true,
      command: 'node --arg=true ./myscript.js test.js',
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
    })
  })

  it('should not append pathsToLint when isFn and shell', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      isFn: true,
      shell: true,
      command: 'node --arg=true ./myscript.js test.js',
    })

    await taskFn()
    expect(execaCommand).toHaveBeenCalledTimes(1)
    expect(execaCommand).lastCalledWith('node --arg=true ./myscript.js test.js', {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: true,
    })
  })

  it('should work with shell', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      shell: true,
      command: 'node --arg=true ./myscript.js',
    })

    await taskFn()
    expect(execaCommand).toHaveBeenCalledTimes(1)
    expect(execaCommand).lastCalledWith('node --arg=true ./myscript.js test.js', {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: true,
    })
  })

  it('should work with path to custom shell', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      shell: '/bin/bash',
      command: 'node --arg=true ./myscript.js',
    })

    await taskFn()
    expect(execaCommand).toHaveBeenCalledTimes(1)
    expect(execaCommand).lastCalledWith('node --arg=true ./myscript.js test.js', {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: '/bin/bash',
    })
  })

  it('should pass `gitDir` as `cwd` to `execa()` gitDir !== process.cwd for git commands', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'git diff',
      gitDir: '../',
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('git', ['diff', 'test.js'], {
      cwd: '../',
      preferLocal: true,
      reject: false,
      shell: false,
    })
  })

  it('should not pass `gitDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', gitDir: '../' })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('jest', ['test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
    })
  })

  it('should throw error for failed linters', async () => {
    expect.assertions(1)
    mockExecaImplementationOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: true,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-fail-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(`"mock-fail-linter [FAILED]"`)
  })

  it('should throw error for interrupted processes', async () => {
    expect.assertions(1)
    mockExecaImplementationOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: false,
      killed: false,
      signal: 'SIGINT',
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-killed-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-killed-linter [SIGINT]"`
    )
  })

  it('should throw error for killed processes without signal', async () => {
    expect.assertions(1)
    mockExecaImplementationOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: false,
      killed: true,
      signal: undefined,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-killed-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-killed-linter [KILLED]"`
    )
  })

  it('should not add TaskError if no error occur', async () => {
    expect.assertions(1)
    const context = getInitialState()
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', gitDir: '../' })
    await taskFn(context)
    expect(context.errors.has(TaskError)).toEqual(false)
  })

  it('should add TaskError on error', async () => {
    mockExecaImplementationOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: true,
      cmd: 'mock cmd',
    })
    const context = getInitialState()
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-fail-linter' })
    expect.assertions(2)
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-fail-linter [FAILED]"`
    )
    expect(context.errors.has(TaskError)).toEqual(true)
  })

  it('should not add output when there is none', async () => {
    expect.assertions(2)
    mockExecaImplementationOnce({
      stdout: '',
      stderr: '',
      code: 0,
      failed: false,
      killed: false,
      signal: undefined,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd', verbose: true })
    const context = getInitialState()
    await expect(taskFn(context)).resolves.toMatchInlineSnapshot(`undefined`)

    expect(context.output).toEqual([])
  })

  it('should add output even when task succeeds if `verbose: true`', async () => {
    expect.assertions(2)
    mockExecaImplementationOnce({
      stdout: 'Mock success',
      stderr: '',
      code: 0,
      failed: false,
      killed: false,
      signal: undefined,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd', verbose: true })
    const context = getInitialState()
    await expect(taskFn(context)).resolves.toMatchInlineSnapshot(`undefined`)

    expect(context.output).toMatchInlineSnapshot(`
      [
        "
      → mock cmd:
      Mock success",
      ]
    `)
  })

  it('should not add title to output when task errors while quiet', async () => {
    expect.assertions(2)
    mockExecaImplementationOnce({
      stdout: '',
      stderr: 'stderr',
      code: 1,
      failed: true,
      killed: false,
      signal: undefined,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd' })
    const context = getInitialState({ quiet: true })
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(`"mock cmd [1]"`)

    expect(context.output).toMatchInlineSnapshot(`
      [
        "stderr",
      ]
    `)
  })

  it('should not print anything when task errors without output while quiet', async () => {
    expect.assertions(2)
    mockExecaImplementationOnce({
      stdout: '',
      stderr: '',
      code: 1,
      failed: true,
      killed: false,
      signal: undefined,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd' })
    const context = getInitialState({ quiet: true })
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(`"mock cmd [1]"`)

    expect(context.output).toEqual([])
  })

  it('should not kill long running tasks without errors in context', async () => {
    execa.mockImplementationOnce(() =>
      mockExecaReturnValue(
        {
          stdout: 'a-ok',
          stderr: '',
          code: 0,
          cmd: 'mock cmd',
          failed: false,
          killed: false,
          signal: null,
        },
        1000
      )
    )

    const context = getInitialState()
    const taskFn = resolveTaskFn({ command: 'node' })
    const taskPromise = taskFn(context)

    jest.runOnlyPendingTimers()

    await expect(taskPromise).resolves.toEqual()
  })

  it('should ignore pid-tree errors', async () => {
    execa.mockImplementationOnce(() =>
      mockExecaReturnValue(
        {
          stdout: 'a-ok',
          stderr: '',
          code: 0,
          cmd: 'mock cmd',
          failed: false,
          killed: false,
          signal: null,
        },
        1000
      )
    )

    pidTree.mockImplementationOnce(() => {
      throw new Error('No matching pid found')
    })

    const context = getInitialState()
    const taskFn = resolveTaskFn({ command: 'node' })
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [KILLED]"`)
  })

  it('should kill a long running task when error event is emitted', async () => {
    execa.mockImplementationOnce(() =>
      mockExecaReturnValue(
        {
          stdout: 'a-ok',
          stderr: '',
          code: 0,
          cmd: 'mock cmd',
          failed: false,
          killed: false,
          signal: null,
        },
        1000
      )
    )

    const context = getInitialState()
    const taskFn = resolveTaskFn({ command: 'node' })
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [KILLED]"`)
  })

  it('should also kill child processes of killed execa processes', async () => {
    expect.assertions(3)

    execa.mockImplementationOnce(() =>
      mockExecaReturnValue(
        {
          stdout: 'a-ok',
          stderr: '',
          code: 0,
          cmd: 'mock cmd',
          failed: false,
          killed: false,
          signal: null,
        },
        1000
      )
    )

    const realKill = process.kill
    const mockKill = jest.fn()
    Object.defineProperty(process, 'kill', {
      value: mockKill,
    })

    pidTree.mockImplementationOnce(() => ['1234'])

    const taskFn = resolveTaskFn({ command: 'node' })

    const context = getInitialState()
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [KILLED]"`)

    expect(mockKill).toHaveBeenCalledTimes(1)
    expect(mockKill).toHaveBeenCalledWith('1234')

    Object.defineProperty(process, 'kill', {
      value: realKill,
    })
  })

  it('should ignore error when trying to kill child processes', async () => {
    expect.assertions(3)

    execa.mockImplementationOnce(() =>
      mockExecaReturnValue(
        {
          stdout: 'a-ok',
          stderr: '',
          code: 0,
          cmd: 'mock cmd',
          failed: false,
          killed: false,
          signal: null,
        },
        1000
      )
    )

    const realKill = process.kill
    const mockKill = jest.fn(() => {
      throw new Error('kill ESRCH')
    })
    Object.defineProperty(process, 'kill', {
      value: mockKill,
    })

    pidTree.mockImplementationOnce(() => ['1234'])

    const taskFn = resolveTaskFn({ command: 'node' })

    const context = getInitialState()
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [KILLED]"`)

    expect(mockKill).toHaveBeenCalledTimes(1)
    expect(mockKill).toHaveBeenCalledWith('1234')

    Object.defineProperty(process, 'kill', {
      value: realKill,
    })
  })
})
