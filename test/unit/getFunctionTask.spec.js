import { expect, jest } from '@jest/globals'

import { getFunctionTask } from '../../lib/getFunctionTask.js'
import { getInitialState } from '../../lib/state.js'
import { TaskError } from '../../lib/symbols.js'

describe('getFunctionTask', () => {
  it('should return wrapped function task', async () => {
    const files = ['file.js']

    const cmd = {
      title: 'My task',
      task: jest.fn(),
    }

    const wrapped = await getFunctionTask(cmd, files)

    expect(wrapped).toEqual([
      {
        title: 'My task',
        task: expect.any(Function),
      },
    ])

    wrapped[0].task()

    expect(cmd.task).toHaveBeenCalledTimes(1)
    expect(cmd.task).toHaveBeenCalledWith(files)
  })

  it('should wrap function task failure', async () => {
    const files = ['file.js']

    const cmd = {
      title: 'My task',
      task: jest.fn().mockImplementation(async () => {
        throw new Error('test error')
      }),
    }

    const wrapped = await getFunctionTask(cmd, files)

    expect(wrapped).toEqual([
      {
        title: 'My task',
        task: expect.any(Function),
      },
    ])

    const context = getInitialState()

    await expect(wrapped[0].task(context)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"My task [FAILED]"`
    )

    expect(context.errors.has(TaskError)).toEqual(true)
  })
})
