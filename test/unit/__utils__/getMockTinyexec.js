import { vi } from 'vitest'

import { mockTinyexecReturnValue } from './mockTinyexecReturnValue.js'

/**
 * @returns {Promise<{ exec: import('vitest').Mocked<import('tinyexec').TinyExec> }>}
 */
export const getMockTinyexec = async () => {
  vi.mock('tinyexec', async (importOriginal) => {
    const mod = await importOriginal()
    return {
      ...mod,
      exec: vi.fn(() => mockTinyexecReturnValue()),
    }
  })

  return import('tinyexec')
}
