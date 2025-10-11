import { describe, it, vi } from 'vitest'

import { getFunctionTask } from '../../lib/getFunctionTask.js'
import { getInitialState } from '../../lib/state.js'
import { TaskError } from '../../lib/symbols.js'

describe('getFunctionTask', () => {
  it('should return wrapped function task', async ({ expect }) => {
    const cmd = {
      title: 'My task',
      task: vi.fn(),
    }

    const wrapped = await getFunctionTask(cmd, [{ filepath: 'file.js', status: 'M' }])

    expect(wrapped).toEqual([
      {
        title: 'My task',
        task: expect.any(Function),
      },
    ])

    wrapped[0].task()

    expect(cmd.task).toHaveBeenCalledTimes(1)
    expect(cmd.task).toHaveBeenCalledExactlyOnceWith(['file.js'])
  })

  it('should wrap function task failure', async ({ expect }) => {
    const cmd = {
      title: 'My task',
      task: vi.fn().mockImplementation(async () => {
        throw new Error('test error')
      }),
    }

    const wrapped = await getFunctionTask(cmd, [{ filepath: 'file.js', status: 'M' }])

    expect(wrapped).toEqual([
      {
        title: 'My task',
        task: expect.any(Function),
      },
    ])

    const context = getInitialState()

    await expect(wrapped[0].task(context)).rejects.toThrow('My task [FAILED]')

    expect(context.errors.has(TaskError)).toEqual(true)
  })
})
