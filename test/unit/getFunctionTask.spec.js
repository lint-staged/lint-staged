import { describe, it, vi } from 'vitest'

import * as figures from '../../lib/figures.js'
import { Signal } from '../../lib/getAbortController.js'
import { getFunctionTask } from '../../lib/getFunctionTask.js'
import { getInitialState } from '../../lib/state.js'
import { TaskError } from '../../lib/symbols.js'

describe('getFunctionTask', () => {
  it('should return wrapped function task', async ({ expect }) => {
    const command = {
      title: 'My task',
      task: vi.fn(),
    }

    const abortController = new AbortController()

    const wrapped = await getFunctionTask({
      abortController,
      command,
      continueOnError: false,
      files: [{ filepath: 'file.js', status: 'M' }],
    })

    expect(wrapped).toEqual([
      {
        title: 'My task',
        task: expect.any(Function),
      },
    ])

    wrapped[0].task()

    expect(command.task).toHaveBeenCalledTimes(1)
    expect(command.task).toHaveBeenCalledExactlyOnceWith(['file.js'], {
      log: expect.any(Function),
    })
  })

  it('should wrap function task failure', async ({ expect }) => {
    const command = {
      title: 'My task',
      task: vi.fn().mockImplementation(async () => {
        throw new Error('test error')
      }),
    }

    const abortController = new AbortController()

    const wrapped = await getFunctionTask({
      abortController,
      command,
      continueOnError: false,
      files: [{ filepath: 'file.js', status: 'M' }],
    })

    expect(wrapped).toEqual([
      {
        title: 'My task',
        task: expect.any(Function),
      },
    ])

    const context = getInitialState()

    await expect(wrapped[0].task(context)).rejects.toThrow('My task [FAILED]')
    expect(context.errors.has(TaskError)).toEqual(true)
    expect(abortController.signal.aborted).toBe(true)
    expect(abortController.signal.reason).toBe(Signal.SIGKILL)
  })

  it('should not kill other tasks when using --continue-on-error', async ({ expect }) => {
    const command = {
      title: 'My task',
      task: vi.fn().mockImplementation(async () => {
        throw new Error('test error')
      }),
    }

    const abortController = new AbortController()

    const wrapped = await getFunctionTask({
      abortController,
      command,
      continueOnError: true,
      files: [{ filepath: 'file.js', status: 'M' }],
    })

    expect(wrapped).toEqual([
      {
        title: 'My task',
        task: expect.any(Function),
      },
    ])

    const context = getInitialState()

    await expect(wrapped[0].task(context)).rejects.toThrow('My task [FAILED]')
    expect(context.errors.has(TaskError)).toEqual(true)

    expect(abortController.signal.aborted).toBe(false)
  })

  it('should collect output from output function on error', async ({ expect }) => {
    const testError = new Error('test error')

    const command = {
      title: 'My task',
      task: vi.fn().mockImplementation(async (_, { log }) => {
        log('test output')
        throw testError
      }),
    }

    const abortController = new AbortController()

    const wrapped = await getFunctionTask({
      abortController,
      command,
      files: [{ filepath: 'file.js', status: 'M' }],
    })

    const context = getInitialState()

    await expect(wrapped[0].task(context)).rejects.toThrow('My task [FAILED]')

    expect(context.output).toEqual([
      expect.stringMatching(`\n${figures.error()} My task:\ntest output\n\n${testError}`),
    ])
  })

  it('should not collect output from output function when task succeeds', async ({ expect }) => {
    const command = {
      title: 'My task',
      task: vi.fn().mockImplementation(async (_, { log }) => {
        log('test output')
      }),
    }

    const wrapped = await getFunctionTask({
      command,
      files: [{ filepath: 'file.js', status: 'M' }],
    })

    const context = getInitialState()

    await wrapped[0].task(context)

    expect(context.output).toStrictEqual([])
  })

  it('should collect output from output function when using --verbose', async ({ expect }) => {
    const command = {
      title: 'My task',
      task: vi.fn().mockImplementation(async (_, { log }) => {
        log('test output')
      }),
    }

    const abortController = new AbortController()

    const wrapped = await getFunctionTask({
      abortController,
      command,
      files: [{ filepath: 'file.js', status: 'M' }],
      verbose: true,
    })

    const context = getInitialState()

    await wrapped[0].task(context)

    expect(context.output).toStrictEqual([`\n${figures.info()} My task:\ntest output`])
  })
})
