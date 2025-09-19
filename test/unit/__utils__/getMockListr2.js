import { figures } from 'listr2'
import { vi } from 'vitest'

export const getMockListr2 = async () => {
  const mockRunner = vi.fn()
  mockRunner.run = vi.fn()

  vi.mock('listr2', () => ({
    Listr: vi.fn(() => mockRunner),
    ListrLogger: vi.fn(),
    figures,
    ProcessOutput: vi.fn(),
  }))

  return import('listr2')
}
