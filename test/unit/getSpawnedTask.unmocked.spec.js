import { describe, it } from 'vitest'

import { getAbortController } from '../../lib/getAbortController.js'
import { getInitialState } from '../../lib/state.js'

const { getSpawnedTask } = await import('../../lib/getSpawnedTask.js')

describe('getSpawnedTask', () => {
  it('should kill a long running task when another fails', async ({ expect }) => {
    const context = getInitialState()

    const abortController = getAbortController()

    const results = await Promise.allSettled([
      getSpawnedTask({
        abortController,
        command: 'node -e "setTimeout(() => void 0, 10000)"',
        isFn: true,
      })(context),
      getSpawnedTask({
        abortController,
        command: 'node -e "process.exit(1)"',
        isFn: true,
      })(context),
    ])

    expect(results).toEqual([
      {
        status: 'rejected',
        reason: expect.any(Error),
      },
      {
        status: 'rejected',
        reason: expect.any(Error),
      },
    ])

    expect(results[0].reason).toHaveProperty(
      'message',
      'node -e "setTimeout(() => void 0, 10000)" [SIGKILL]'
    )

    expect(results[1].reason).toHaveProperty('message', 'node -e "process.exit(1)" [FAILED]')
  })

  it('should kill task on SIGINT', async ({ expect }) => {
    const context = getInitialState()

    const abortController = getAbortController()

    const taskPromise = getSpawnedTask({
      abortController,
      command: 'node -e "setTimeout(() => void 0, 10000)"',
      isFn: true,
    })(context)

    abortController.abort('SIGINT')

    const [result] = await Promise.allSettled([taskPromise])

    expect(result).toEqual({
      status: 'rejected',
      reason: expect.any(Error),
    })
  })
})
