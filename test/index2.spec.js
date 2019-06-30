import Listr from 'listr'
import path from 'path'

// silence console from Jest output
console.log = jest.fn(() => {})
console.error = jest.fn(() => {})

jest.mock('listr')

// eslint-disable-next-line import/first
import lintStaged from '../src/index'

describe('lintStaged', () => {
  afterEach(() => {
    Listr.mockClear()
  })

  it('should pass quiet flag to Listr', async () => {
    expect.assertions(1)
    await lintStaged(
      console,
      path.join(__dirname, '__mocks__', 'my-config.json'),
      false,
      true,
      false
    )
    expect(Listr.mock.calls[0][1]).toEqual({ dateFormat: false, renderer: 'silent' })
  })

  it('should pass debug flag to Listr', async () => {
    expect.assertions(1)
    await lintStaged(
      console,
      path.join(__dirname, '__mocks__', 'my-config.json'),
      false,
      false,
      true
    )
    expect(Listr.mock.calls[0][1]).toEqual({ dateFormat: false, renderer: 'verbose' })
  })
})
