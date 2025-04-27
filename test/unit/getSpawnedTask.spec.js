import { jest } from '@jest/globals'
import { SubprocessError } from 'nano-spawn'

import { getInitialState } from '../../lib/state.js'
import { TaskError } from '../../lib/symbols.js'
import { getMockNanoSpawn } from './__utils__/getMockNanoSpawn.js'
import { mockNanoSpawnReturnValue } from './__utils__/mockNanoSpawnReturnValue.js'

const { default: spawn } = await getMockNanoSpawn()

jest.unstable_mockModule('pidtree', () => ({
  default: jest.fn(async () => []),
}))

const { default: pidTree } = await import('pidtree')

const { getSpawnedTask } = await import('../../lib/getSpawnedTask.js')

jest.useFakeTimers()

const defaultOpts = { files: ['test.js'] }

describe('getSpawnedTask', () => {
  beforeEach(() => {
    spawn.mockClear()
  })

  it('should support non npm scripts', async () => {
    expect.assertions(2)
    const taskFn = getSpawnedTask({
      ...defaultOpts,
      command: 'node --arg=true ./myscript.js',
    })

    await taskFn()
    expect(spawn).toHaveBeenCalledTimes(1)
    expect(spawn).toHaveBeenLastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      stdin: 'ignore',
    })
  })

  it('should not append pathsToLint when isFn', async () => {
    expect.assertions(2)
    const taskFn = getSpawnedTask({
      ...defaultOpts,
      isFn: true,
      command: 'node --arg=true ./myscript.js test.js',
    })

    await taskFn()
    expect(spawn).toHaveBeenCalledTimes(1)
    expect(spawn).toHaveBeenLastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      stdin: 'ignore',
    })
  })

  it('should pass `topLevelDir` as `cwd` to `spawn()` topLevelDir !== process.cwd for git commands', async () => {
    expect.assertions(2)
    const taskFn = getSpawnedTask({
      ...defaultOpts,
      command: 'git diff',
      topLevelDir: '../',
    })

    await taskFn()
    expect(spawn).toHaveBeenCalledTimes(1)
    expect(spawn).toHaveBeenLastCalledWith('git', ['diff', 'test.js'], {
      cwd: '../',
      preferLocal: true,
      stdin: 'ignore',
    })
  })

  it('should not pass `topLevelDir` as `cwd` to `spawn()` if a non-git binary is called', async () => {
    expect.assertions(2)
    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'jest', topLevelDir: '../' })

    await taskFn()
    expect(spawn).toHaveBeenCalledTimes(1)
    expect(spawn).toHaveBeenLastCalledWith('jest', ['test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      stdin: 'ignore',
    })
  })

  it('should throw error for failed tasks', async () => {
    expect.assertions(1)

    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: 'Mock error',
          nodeChildProcess: { pid: 0 },
        })
      )
    )

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock-fail-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(`"mock-fail-linter [FAILED]"`)
  })

  it('should throw error for interrupted processes', async () => {
    expect.assertions(1)

    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: 'Mock error',
          signalName: 'SIGINT',
          nodeChildProcess: { pid: 0 },
        })
      )
    )

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock-killed-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-killed-linter [SIGINT]"`
    )
  })

  it('should throw error for killed processes without signal', async () => {
    expect.assertions(1)

    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: 'Mock error',
          nodeChildProcess: { pid: 0 },
        })
      )
    )

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock-killed-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-killed-linter [FAILED]"`
    )
  })

  it('should not add TaskError if no error occur', async () => {
    expect.assertions(1)
    const context = getInitialState()
    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'jest', topLevelDir: '../' })
    await taskFn(context)
    expect(context.errors.has(TaskError)).toEqual(false)
  })

  it('should add TaskError on error', async () => {
    expect.assertions(2)

    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: 'Mock error',
          nodeChildProcess: { pid: 0 },
        })
      )
    )

    const context = getInitialState()
    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock-fail-linter' })
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-fail-linter [FAILED]"`
    )
    expect(context.errors.has(TaskError)).toEqual(true)
  })

  it('should not add output when there is none', async () => {
    expect.assertions(2)

    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue({
        output: '',
        nodeChildProcess: { pid: 0 },
      })
    )

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock cmd', verbose: true })
    const context = getInitialState()
    await expect(taskFn(context)).resolves.toMatchInlineSnapshot(`undefined`)

    expect(context.output).toEqual([])
  })

  it('should add output even when task succeeds if `verbose: true`', async () => {
    expect.assertions(2)

    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue({
        output: 'Mock success',
        nodeChildProcess: { pid: 0 },
      })
    )

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock cmd', verbose: true })
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

    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: 'stderr',
          nodeChildProcess: { pid: 0 },
        })
      )
    )

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock cmd' })
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

    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: '',
          nodeChildProcess: { pid: 0 },
        })
      )
    )

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock cmd' })
    const context = getInitialState({ quiet: true })
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(`"mock cmd [FAILED]"`)

    expect(context.output).toEqual([])
  })

  it('should not kill long running tasks without errors in context', async () => {
    spawn.mockImplementationOnce(() => mockNanoSpawnReturnValue(undefined, 1000))

    const context = getInitialState()
    const taskFn = getSpawnedTask({ command: 'node' })
    const taskPromise = taskFn(context)

    jest.runOnlyPendingTimers()

    await expect(taskPromise).resolves.toEqual()
  })

  it('should ignore pid-tree errors', async () => {
    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: '',
          signalName: 'SIGKILL',
          nodeChildProcess: { pid: 0 },
        }),
        1000
      )
    )

    pidTree.mockImplementationOnce(() => {
      throw new Error('No matching pid found')
    })

    const context = getInitialState()
    const taskFn = getSpawnedTask({ command: 'node' })
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [SIGKILL]"`)
  })

  it('should kill a long running task when error event is emitted', async () => {
    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: '',
          signalName: 'SIGKILL',
          nodeChildProcess: { pid: 0 },
        }),
        1000
      )
    )

    const context = getInitialState()
    const taskFn = getSpawnedTask({ command: 'node' })
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [SIGKILL]"`)
  })

  it('should also kill child processes of killed spawn processes', async () => {
    expect.assertions(3)

    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: '',
          signalName: 'SIGKILL',
          nodeChildProcess: { pid: 0 },
        }),
        1000
      )
    )

    const realKill = process.kill
    const mockKill = jest.fn()
    Object.defineProperty(process, 'kill', {
      value: mockKill,
    })

    pidTree.mockImplementationOnce(() => ['1234'])

    const taskFn = getSpawnedTask({ command: 'node' })

    const context = getInitialState()
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [SIGKILL]"`)

    expect(mockKill).toHaveBeenCalledTimes(1)
    expect(mockKill).toHaveBeenCalledWith('1234')

    Object.defineProperty(process, 'kill', {
      value: realKill,
    })
  })

  it('should ignore error when trying to kill child processes', async () => {
    expect.assertions(3)

    spawn.mockReturnValueOnce(
      mockNanoSpawnReturnValue(
        Object.assign(new SubprocessError(), {
          output: '',
          signalName: 'SIGKILL',
          nodeChildProcess: { pid: 0 },
        }),
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

    const taskFn = getSpawnedTask({ command: 'node' })

    const context = getInitialState()
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [SIGKILL]"`)

    expect(mockKill).toHaveBeenCalledTimes(1)
    expect(mockKill).toHaveBeenCalledWith('1234')

    Object.defineProperty(process, 'kill', {
      value: realKill,
    })
  })
})
