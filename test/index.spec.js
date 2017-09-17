/* eslint no-global-assign: 0 */

import { makeConsoleMock } from 'consolemock'
import cosmiconfig from 'cosmiconfig'
import lintStaged from '../src/index'

jest.mock('cosmiconfig')

describe('lintStaged', () => {
  beforeEach(() => {
    console = makeConsoleMock()
  })

  it('should ouput config in verbose mode', async () => {
    const config = {
      verbose: true,
      linters: {
        '*': 'mytask'
      }
    }
    cosmiconfig.mockImplementationOnce(() => Promise.resolve({ config }))
    await lintStaged()
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should not output config in non verbose mode', async () => {
    const config = {
      '*': 'mytask'
    }
    cosmiconfig.mockImplementationOnce(() => Promise.resolve({ config }))
    await lintStaged()
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should print helpful error message when config file is not found', async () => {
    cosmiconfig.mockImplementationOnce(() => Promise.resolve(null))
    await lintStaged()
    expect(console.printHistory()).toMatchSnapshot()
  })
})
