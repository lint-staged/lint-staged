import { figures } from 'listr2'
import { jest } from '@jest/globals'

export const mockListr = async () => {
  jest.unstable_mockModule('listr2', () => ({
    Listr: jest.fn(async () => void 0),
    figures,
  }))

  return import('listr2')
}
