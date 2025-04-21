import { expect, jest } from '@jest/globals'

import { getInitialState } from '../../lib/state.js'
import { TaskError } from '../../lib/symbols.js'
import { getMockExec } from './__utils__/getMockExec.js'
import { mockExecReturnValue } from './__utils__/mockExecReturnValue.js'

const { exec } = await getMockExec()

jest.unstable_mockModule('pidtree', () => ({
  default: jest.fn(async () => []),
}))

const { default: pidTree } = await import('pidtree')

const { resolveTaskFn } = await import('../../lib/resolveTaskFn.js')

jest.useFakeTimers()

const defaultOpts = { files: ['test.js'] }

describe('resolveTaskFn', () => {
  beforeEach(() => {
    exec.mockClear()
  })

  it('should support non npm scripts', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'node --arg=true ./myscript.js',
    })

    await taskFn()
    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenLastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      cwd: process.cwd(),
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
    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenLastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      cwd: process.cwd(),
    })
  })

  it('should pass `topLevelDir` as `cwd` to `exec()` topLevelDir !== process.cwd for git commands', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'git diff',
      topLevelDir: '../',
    })

    await taskFn()
    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenLastCalledWith('git', ['diff', 'test.js'], {
      cwd: '../',
    })
  })

  it('should not pass `topLevelDir` as `cwd` to `exec()` if a non-git binary is called', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', topLevelDir: '../' })

    await taskFn()
    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenLastCalledWith('jest', ['test.js'], {
      cwd: process.cwd(),
    })
  })

  it('should throw error for failed tasks', async () => {
    expect.assertions(1)

    exec.mockReturnValueOnce(
      mockExecReturnValue({
        output: 'Mock error',
        process: {
          cmd: 'mock cmd',
          exitCode: 1,
          killed: false,
          signalCode: null,
        },
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-fail-linter' })

    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(`"mock-fail-linter [FAILED]"`)
  })

  it('should throw error for interrupted processes', async () => {
    expect.assertions(1)
    exec.mockReturnValueOnce(
      mockExecReturnValue({
        output: 'Mock error',
        process: {
          cmd: 'mock cmd',
          exitCode: 1,
          killed: true,
          signalCode: 'SIGINT',
        },
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-killed-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-killed-linter [SIGINT]"`
    )
  })

  it('should throw error for killed processes without signal', async () => {
    expect.assertions(1)
    exec.mockReturnValueOnce(
      mockExecReturnValue({
        output: 'Mock error',
        process: {
          cmd: 'mock cmd',
          exitCode: 1,
          killed: true,
          signalCode: undefined,
        },
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-killed-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-killed-linter [KILLED]"`
    )
  })

  it('should not add TaskError if no error occur', async () => {
    expect.assertions(1)
    const context = getInitialState()
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', topLevelDir: '../' })
    await taskFn(context)
    expect(context.errors.has(TaskError)).toEqual(false)
  })

  it('should add TaskError on error', async () => {
    exec.mockReturnValueOnce(
      mockExecReturnValue({
        output: 'Mock error',
        process: {
          cmd: 'mock cmd',
          exitCode: 1,
          killed: false,
          signalCode: undefined,
        },
      })
    )

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
    exec.mockReturnValueOnce(
      mockExecReturnValue({
        output: '',
        process: {
          cmd: 'mock cmd',
          exitCode: 0,
          killed: false,
          signalCode: undefined,
        },
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd', verbose: true })
    const context = getInitialState()
    await expect(taskFn(context)).resolves.toMatchInlineSnapshot(`undefined`)

    expect(context.output).toEqual([])
  })

  it('should add output even when task succeeds if `verbose: true`', async () => {
    expect.assertions(2)
    exec.mockReturnValueOnce(
      mockExecReturnValue({
        output: 'Mock success',
        process: {
          cmd: 'mock cmd',
          exitCode: 0,
          killed: false,
          signalCode: undefined,
        },
      })
    )

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
    exec.mockReturnValueOnce(
      mockExecReturnValue({
        output: 'stderr',
        process: {
          cmd: 'mock cmd',
          exitCode: 1,
          killed: false,
          signalCode: undefined,
        },
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd' })
    const context = getInitialState({ quiet: true })
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(`"mock cmd [FAILED]"`)

    expect(context.output).toMatchInlineSnapshot(`
      [
        "stderr",
      ]
    `)
  })

  it('should not print anything when task errors without output while quiet', async () => {
    expect.assertions(2)
    exec.mockReturnValueOnce(
      mockExecReturnValue({
        output: '',
        process: {
          cmd: 'mock cmd',
          exitCode: 1,
          killed: false,
          signalCode: undefined,
        },
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd' })
    const context = getInitialState({ quiet: true })
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(`"mock cmd [FAILED]"`)

    expect(context.output).toEqual([])
  })

  it('should not kill long running tasks without errors in context', async () => {
    exec.mockImplementationOnce(() => mockExecReturnValue(undefined, 1000))

    const context = getInitialState()
    const taskFn = resolveTaskFn({ command: 'node' })
    const taskPromise = taskFn(context)

    jest.runOnlyPendingTimers()

    await expect(taskPromise).resolves.toEqual()
  })

  it('should ignore pid-tree errors', async () => {
    exec.mockImplementationOnce(() => mockExecReturnValue(undefined, 1000))

    pidTree.mockImplementationOnce(() => {
      throw new Error('No matching pid found')
    })

    const context = getInitialState()
    const taskFn = resolveTaskFn({ command: 'node' })
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).resolves.toBeUndefined()
  })

  it('should kill a long running task when error event is emitted', async () => {
    exec.mockImplementationOnce(() => mockExecReturnValue(undefined, 1000))

    const context = getInitialState()
    const taskFn = resolveTaskFn({ command: 'node' })
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [KILLED]"`)
  })

  it('should also kill child processes of killed exec processes', async () => {
    expect.assertions(3)

    exec.mockImplementationOnce(() => mockExecReturnValue(undefined, 1000))

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

    exec.mockImplementationOnce(() => mockExecReturnValue(undefined, 1000))

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
