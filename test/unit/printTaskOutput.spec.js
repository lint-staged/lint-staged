import { jest } from '@jest/globals'

import { printTaskOutput } from '../../lib/printTaskOutput.js'

const logger = {
  error: jest.fn(() => {}),
  log: jest.fn(() => {}),
}

describe('printTaskOutput', () => {
  it('should no-op when context is incomplete', () => {
    printTaskOutput(undefined, logger)
    printTaskOutput({}, logger)
    expect(logger.error).toHaveBeenCalledTimes(0)
    expect(logger.log).toHaveBeenCalledTimes(0)
  })
})
