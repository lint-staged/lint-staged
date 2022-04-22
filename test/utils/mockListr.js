import { figures } from 'listr2'
import { jest } from '@jest/globals'

export const mockListr = async () => {
  const mockRunner = jest.fn()
  mockRunner.run = jest.fn()

  jest.unstable_mockModule('listr2', () => ({
    Listr: jest.fn(() => mockRunner),
    figures,
  }))

  return import('listr2')
}
