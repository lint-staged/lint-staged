import { jest } from '@jest/globals'
import { SubprocessError } from 'nano-spawn'

import { mockNanoSpawnReturnValue } from './mockNanoSpawnReturnValue.js'

/** @returns {Promise<jest.Mocked<import('nano-spawn')>>} */
export const getMockNanoSpawn = async (mockReturnValue) => {
  jest.unstable_mockModule('nano-spawn', () => {
    return {
      default: jest.fn(() => mockNanoSpawnReturnValue(mockReturnValue)),
      SubprocessError,
    }
  })

  return import('nano-spawn')
}
