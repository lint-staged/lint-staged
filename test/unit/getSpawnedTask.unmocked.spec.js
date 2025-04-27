import { getSpawnedTask } from '../../lib/getSpawnedTask.js'
import { getInitialState } from '../../lib/state.js'

describe('getSpawnedTask', () => {
  it('should kill a long running task when another fails', async () => {
    const context = getInitialState()

    const taskFn = getSpawnedTask({
      command: 'node -e "setTimeout(() => void 0, 10000)"',
      isFn: true,
    })
    const taskPromise = taskFn(context)

    const taskFn2 = getSpawnedTask({
      command: 'node -e "process.exit(1)"',
      isFn: true,
    })
    const task2Promise = taskFn2(context)

    await expect(task2Promise).rejects.toThrowErrorMatchingInlineSnapshot(
      `"node -e "process.exit(1)" [FAILED]"`
    )
    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(
      `"node -e "setTimeout(() => void 0, 10000)" [SIGKILL]"`
    )
  })
})
