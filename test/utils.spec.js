import { escape } from '../lib/escape'
import utils from '../utils'

jest.mock('../lib/escape.js', () => ({ escape: jest.fn() }))

test('escape', () => {
  expect.assertions(2)
  const mockEscape = jest.fn()
  escape.mockImplementation(mockEscape)
  utils.escape('test')
  expect(mockEscape).toHaveBeenCalledTimes(1)
  expect(mockEscape).toHaveBeenCalledWith('test')
})
