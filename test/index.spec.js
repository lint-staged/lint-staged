/* eslint no-unused-expressions: 0 */
/* eslint no-console: 0 */
/* eslint no-global-assign: 0 */

import { makeConsoleMock } from 'consolemock'
import lintStaged from '../src/index'

jest.mock('cosmiconfig', () => jest.fn(() => Promise.resolve({ config: { verbose: true } })))
const cosmiconfig = require('cosmiconfig')

describe('lintStaged', () => {
  beforeEach(() => {
    process.stdout.isTTY = false // Overwrite TTY mode in order for Listr to use verbose renderer
    console = makeConsoleMock()
  })

  it('should ouput config in verbose mode', async () => {
    const config = {
      verbose: true,
      linters: {
        '*': 'mytask'
      }
    }
    cosmiconfig.mockImplementation(() => Promise.resolve({ config }))
    await lintStaged()
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should not output config in non verbose mode', async () => {
    const config = {
      '*': 'mytask'
    }
    cosmiconfig.mockImplementation(() => Promise.resolve({ config }))
    await lintStaged()
    expect(console.printHistory()).toMatchSnapshot()
  })
})
