import { jest } from '@jest/globals'

import { printTaskOutput } from '../lib/printTaskOutput.mjs'

const logger = {
  error: jest.fn(() => void {}),
  log: jest.fn(() => void {}),
}

describe('printTaskOutput', () => {
  it('should no-op when context is incomplete', () => {
    printTaskOutput(undefined, logger)
    printTaskOutput({}, logger)
    expect(logger.error).toHaveBeenCalledTimes(0)
    expect(logger.log).toHaveBeenCalledTimes(0)
  })
})
