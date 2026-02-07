import { exec } from 'tinyexec'
import { beforeEach, describe, it, vi } from 'vitest'

import { getAbortController } from '../../lib/getAbortController.js'
import { killSubProcesses } from '../../lib/killSubprocesses.js'
import { getInitialState } from '../../lib/state.js'
import { TaskError } from '../../lib/symbols.js'

vi.mock('tinyexec', () => ({
  exec: vi.fn().mockReturnValue({
    async *[Symbol.asyncIterator]() {
      yield 'test'
    },
  }),
}))

const { getSpawnedTask } = await import('../../lib/getSpawnedTask.js')

vi.useFakeTimers()

vi.mock('../../lib/killSubprocesses.js', () => ({
  killSubProcesses: vi.fn(),
}))

const abortController = getAbortController()

const defaultOpts = { abortController, files: ['test.js'] }

describe('getSpawnedTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should pass FORCE_COLOR var to task when color supported', async ({ expect }) => {
    expect.assertions(2)
    const taskFn = getSpawnedTask({
      ...defaultOpts,
      command: 'node --arg=true ./myscript.js',
      color: true,
    })

    await taskFn()
    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenLastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      nodeOptions: {
        cwd: process.cwd(),
        detached: true,
        stdio: ['ignore'],
        env: { FORCE_COLOR: 'true' },
      },
    })
  })

  it('should support non npm scripts', async ({ expect }) => {
    expect.assertions(2)
    const taskFn = getSpawnedTask({
      ...defaultOpts,
      command: 'node --arg=true ./myscript.js',
    })

    await taskFn()
    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenLastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      nodeOptions: {
        cwd: process.cwd(),
        detached: true,
        stdio: ['ignore'],
        env: { NO_COLOR: 'true' },
      },
    })
  })

  it('should not append pathsToLint when isFn', async ({ expect }) => {
    expect.assertions(2)
    const taskFn = getSpawnedTask({
      ...defaultOpts,
      isFn: true,
      command: 'node --arg=true ./myscript.js test.js',
    })

    await taskFn()
    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenLastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      nodeOptions: {
        cwd: process.cwd(),
        detached: true,
        stdio: ['ignore'],
        env: { NO_COLOR: 'true' },
      },
    })
  })

  it('should pass `topLevelDir` as `cwd` to `spawn()` topLevelDir !== process.cwd for git commands', async ({
    expect,
  }) => {
    expect.assertions(2)
    const taskFn = getSpawnedTask({
      ...defaultOpts,
      command: 'git diff',
      topLevelDir: '../',
    })

    await taskFn()
    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenLastCalledWith('git', ['diff', 'test.js'], {
      nodeOptions: {
        cwd: '../',
        detached: true,
        stdio: ['ignore'],
        env: { NO_COLOR: 'true' },
      },
    })
  })

  it('should not pass `topLevelDir` as `cwd` to `spawn()` if a non-git binary is called', async ({
    expect,
  }) => {
    expect.assertions(2)
    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'jest', topLevelDir: '../' })

    await taskFn()
    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenLastCalledWith('jest', ['test.js'], {
      nodeOptions: {
        cwd: process.cwd(),
        detached: true,
        stdio: ['ignore'],
        env: { NO_COLOR: 'true' },
      },
    })
  })

  it('should throw error for failed tasks', async ({ expect }) => {
    expect.assertions(1)

    vi.mocked(exec).mockReturnValueOnce({
      exitCode: 1,
      async *[Symbol.asyncIterator]() {
        yield 'test'
      },
    })

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock-fail-linter' })
    await expect(taskFn()).rejects.toThrow('mock-fail-linter [FAILED]')
  })

  it('should throw error for interrupted processes', async ({ expect }) => {
    expect.assertions(1)

    vi.mocked(exec).mockReturnValueOnce({
      process: {
        signalCode: 'SIGINT',
        kill: vi.fn(),
      },
      async *[Symbol.asyncIterator]() {
        yield 'test'
      },
    })

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock-killed-linter' })
    await expect(taskFn()).rejects.toThrow('mock-killed-linter [SIGINT]')
  })

  it('should not add TaskError if no error occur', async ({ expect }) => {
    expect.assertions(1)
    const context = getInitialState()
    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'jest', topLevelDir: '../' })
    await taskFn(context)
    expect(context.errors.has(TaskError)).toEqual(false)
  })

  it('should add TaskError on error', async ({ expect }) => {
    expect.assertions(2)

    vi.mocked(exec).mockReturnValueOnce({
      exitCode: 1,
      async *[Symbol.asyncIterator]() {
        yield 'test'
      },
    })

    const context = getInitialState()
    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock-fail-linter' })
    await expect(taskFn(context)).rejects.toThrow('mock-fail-linter [FAILED]')
    expect(context.errors.has(TaskError)).toEqual(true)
  })

  it('should not add output when there is none', async ({ expect }) => {
    expect.assertions(2)

    vi.mocked(exec).mockReturnValue({
      async *[Symbol.asyncIterator]() {},
    })

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock cmd', verbose: true })
    const context = getInitialState()
    await expect(taskFn(context)).resolves.toMatchInlineSnapshot(`undefined`)

    expect(context.output).toEqual([])
  })

  it('should add output even when task succeeds if `verbose: true`', async ({ expect }) => {
    expect.assertions(2)

    vi.mocked(exec).mockReturnValueOnce({
      async *[Symbol.asyncIterator]() {
        yield 'Mock success'
      },
    })

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

  it('should not add title to output when task errors while quiet', async ({ expect }) => {
    expect.assertions(2)

    vi.mocked(exec).mockReturnValueOnce({
      exitCode: 1,
      async *[Symbol.asyncIterator]() {
        yield 'stderr'
      },
    })

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock cmd' })
    const context = getInitialState({ quiet: true })
    await expect(taskFn(context)).rejects.toThrow('mock cmd [FAILED]')

    expect(context.output).toMatchInlineSnapshot(`
      [
        "stderr",
      ]
    `)
  })

  it('should not print anything when task errors without output while quiet', async ({
    expect,
  }) => {
    expect.assertions(2)

    vi.mocked(exec).mockReturnValueOnce({
      exitCode: 1,
      async *[Symbol.asyncIterator]() {
        yield ''
      },
    })

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'mock cmd' })
    const context = getInitialState({ quiet: true })
    await expect(taskFn(context)).rejects.toThrow('mock cmd [FAILED]')

    expect(context.output).toEqual([])
  })

  it('should not kill long running tasks without errors in context', async ({ expect }) => {
    vi.mocked(exec).mockReturnValueOnce({
      async *[Symbol.asyncIterator]() {
        yield 'test'
      },
    })

    const context = getInitialState()
    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'node' })
    const taskPromise = taskFn(context)

    vi.runOnlyPendingTimers()

    await expect(taskPromise).resolves.toEqual()
  })

  it('should also kill child processes of killed spawn processes', async ({ expect }) => {
    expect.assertions(2)

    vi.mocked(exec).mockReturnValueOnce({
      process: {
        pid: 1234,
        signalCode: 'SIGKILL',
      },
      async *[Symbol.asyncIterator]() {
        yield 'test'
      },
    })

    const taskFn = getSpawnedTask({ ...defaultOpts, command: 'node' })

    const context = getInitialState()
    const taskPromise = taskFn(context)

    vi.runAllTimers()

    await expect(taskPromise).rejects.toThrow('node [SIGKILL]')

    expect(killSubProcesses).toHaveBeenCalledWith(1234)
  })

  it('should throw error when failed to spawn without error code', async ({ expect }) => {
    expect.assertions(1)

    const taskFn = getSpawnedTask({
      ...defaultOpts,
      command: 'node',
    })

    vi.mocked(exec).mockReturnValueOnce({
      // eslint-disable-next-line require-yield
      async *[Symbol.asyncIterator]() {
        throw new Error('Oops')
      },
    })

    await expect(() => taskFn()).rejects.toThrow('node [FAILED]')
  })

  it('should not kill other tasks when failing to spawn, when continueOnError: true', async ({
    expect,
  }) => {
    expect.assertions(2)

    const abortController = getAbortController()

    const taskFn = getSpawnedTask({
      ...defaultOpts,
      abortController,
      continueOnError: true,
      command: 'node',
    })

    vi.mocked(exec).mockReturnValueOnce({
      // eslint-disable-next-line require-yield
      async *[Symbol.asyncIterator]() {
        throw new Error('Oops')
      },
    })

    await expect(() => taskFn()).rejects.toThrow('node [FAILED]')

    expect(abortController.signal.aborted).toBe(false)
  })
})
