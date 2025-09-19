import { describe, it, vi } from 'vitest'

import { printTaskOutput } from '../../lib/printTaskOutput.js'

const logger = {
  error: vi.fn(() => {}),
  log: vi.fn(() => {}),
}

describe('printTaskOutput', () => {
  it('should no-op when context is incomplete', ({ expect }) => {
    printTaskOutput(undefined, logger)
    printTaskOutput({}, logger)
    expect(logger.error).toHaveBeenCalledTimes(0)
    expect(logger.log).toHaveBeenCalledTimes(0)
  })
})
