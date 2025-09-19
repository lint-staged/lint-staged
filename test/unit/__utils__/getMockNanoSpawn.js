import { vi } from 'vitest'

import { mockNanoSpawnReturnValue } from './mockNanoSpawnReturnValue.js'

/** @returns {Promise<jest.Mocked<import('nano-spawn')>>} */
export const getMockNanoSpawn = async () => {
  vi.mock('nano-spawn', async (importOriginal) => {
    const mod = await importOriginal()
    return {
      ...mod,
      default: vi.fn(() => mockNanoSpawnReturnValue()),
    }
  })

  return import('nano-spawn')
}
