import debugLib from 'debug'

import { setupDebugLogStream } from '../../lib/debug'

describe('setupDebugLogStream', () => {
  it('should override default method when enabled', () => {
    const defaultLog = debugLib.log

    setupDebugLogStream(true)

    expect(debugLib.log).toBeInstanceOf(Function)
    expect(debugLib.log).not.toEqual(defaultLog)
  })
})
