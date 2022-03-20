import { jest } from '@jest/globals'

const mockFn = jest.fn((path) => {
  if (path.includes('missing')) {
    throw new Error(`not found: ${path}`)
  }
  return path
})

const npmWhich = () => {
  return {
    sync: mockFn,
  }
}

npmWhich.mockFn = mockFn

export default npmWhich
