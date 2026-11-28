import { exec } from 'tinyexec'
import { describe, it, vi } from 'vitest'

import { enableColors } from '../../lib/colors.js'

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

const abortController = new AbortController()

const defaultOpts = { abortController, files: ['test.js'] }

describe('getSpawnedTask', () => {
  it('should pass FORCE_COLOR var to task when color supported', async ({ expect }) => {
    enableColors(true)

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
        env: { FORCE_COLOR: 'true' },
      },
    })
  })
})
