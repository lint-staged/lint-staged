import { SubprocessError } from 'nano-spawn'
import { describe, it } from 'vitest'

import { getSpawnedTask } from '../../lib/getSpawnedTask.js'
import { getInitialState } from '../../lib/state.js'

describe('getSpawnedTask', () => {
  it('should kill a long running task when another fails', async ({ expect }) => {
    const context = getInitialState()

    const abortController = new AbortController()

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
        reason: Error('node -e "setTimeout(() => void 0, 10000)" [SIGKILL]', {
          cause: expect.any(SubprocessError),
        }),
      },
      {
        status: 'rejected',
        reason: Error('node -e "process.exit(1)" [FAILED]', {
          cause: expect.any(SubprocessError),
        }),
      },
    ])
  })

  it('should kill task on SIGINT', async ({ expect }) => {
    const context = getInitialState()

    const abortController = new AbortController()

    const taskPromise = getSpawnedTask({
      abortController,
      command: 'node -e "setTimeout(() => void 0, 10000)"',
      isFn: true,
    })(context)

    abortController.abort('SIGINT')

    const [result] = await Promise.allSettled([taskPromise])

    expect(result).toEqual({
      status: 'rejected',
      reason: Error('node -e "setTimeout(() => void 0, 10000)" [SIGINT]', {
        cause: expect.any(SubprocessError),
      }),
    })
  })
})
