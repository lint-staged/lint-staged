import { makeConsoleMock } from 'consolemock'
import cosmiconfig from 'cosmiconfig'
import path from 'path'
import lintStaged from '../src/index'

jest.mock('cosmiconfig')

describe('lintStaged', () => {
  beforeEach(() => {
    console = makeConsoleMock()
  })

  it('should output config in verbose mode', async () => {
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

  it('should load config file when specified', async () => {
    await lintStaged(path.join(__dirname, '__mocks__', 'my-config.json'))
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should print helpful error message when config file is not found', async () => {
    cosmiconfig.mockImplementationOnce(() => Promise.resolve(null))
    await lintStaged()
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should print helpful error message when explicit config file is not found', async () => {
    await lintStaged('fake-config-file.yml')
    expect(console.printHistory()).toMatchSnapshot()
  })
})
