import { exec } from 'node:child_process'

import { afterAll, beforeAll, beforeEach } from 'vitest'
import { describe, it, vi } from 'vitest'

import { killSubProcesses } from '../../lib/killSubprocesses.js'

vi.mock('node:child_process', () => ({
  exec: vi.fn((cb) => cb()),
}))

describe('killSubProcesses', () => {
  const realKill = process.kill
  const mockKill = vi.fn()

  beforeAll(() => {
    Object.defineProperty(process, 'kill', {
      value: mockKill,
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    Object.defineProperty(process, 'kill', {
      value: realKill,
    })
  })

  it('should kill Windows process and subprocesses', async ({ expect }) => {
    await killSubProcesses(1234, true)

    expect(mockKill).not.toHaveBeenCalled()

    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenCalledWith(`taskkill /pid 1234 /T /F`, expect.any(Function))
  })

  it('should kill Unix process group', async ({ expect }) => {
    const mockKill = vi.fn()
    Object.defineProperty(process, 'kill', {
      value: mockKill,
    })

    await killSubProcesses(1234, false)

    expect(mockKill).toHaveBeenCalledTimes(1)
    expect(mockKill).toHaveBeenCalledWith(-1234, 'SIGKILL')

    expect(exec).not.toHaveBeenCalled()
  })
})
