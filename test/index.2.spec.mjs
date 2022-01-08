import { jest } from '@jest/globals'

const MOCK_ERROR = new Error('MOCK_ERROR')

jest.unstable_mockModule('../lib/runAll.mjs', () => ({
  runAll: jest.fn(() => Promise.reject(MOCK_ERROR)),
}))

const { default: lintStaged } = await import('../lib/index.mjs')

describe('lintStaged', () => {
  it('should re-throw unknown errors from runAll', async () => {
    expect.assertions(1)
    await expect(lintStaged()).rejects.toEqual(MOCK_ERROR)
  })
})
