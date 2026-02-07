import { describe, it, vi } from 'vitest'

import { getAbortController } from '../../lib/getAbortController.js'

describe('getAbortController', () => {
  it('should return AbortController which aborts on SIGINT', ({ expect }) => {
    let sigintCallback

    const mockProcess = {
      on: vi.fn().mockImplementation((eventName, callback) => {
        if (eventName === 'SIGINT') {
          sigintCallback = callback
        }
      }),
    }

    const abortController = getAbortController(mockProcess)

    expect(abortController.signal.aborted).toBe(false)

    sigintCallback?.()

    expect(abortController.signal.aborted).toBe(true)
    expect(abortController.signal.reason).toBe('SIGINT')
  })
})
