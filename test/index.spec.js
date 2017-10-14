import { makeConsoleMock } from 'consolemock'
import cosmiconfig from 'cosmiconfig'
import path from 'path'
import lintStaged from '../src/index'

const replaceSerializer = (from, to) => ({
  test: val => typeof val === 'string' && from.test(val),
  print: val => val.replace(from, to)
})

jest.mock('cosmiconfig')

describe('lintStaged', () => {
  let logger
  beforeEach(() => {
    logger = makeConsoleMock()
  })

  it('should output config in verbose mode', async () => {
    const config = {
      verbose: true,
      linters: {
        '*': 'mytask'
      }
    }
    cosmiconfig.mockImplementationOnce(() => Promise.resolve({ config }))
    await lintStaged(undefined, logger)
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should not output config in non verbose mode', async () => {
    const config = {
      '*': 'mytask'
    }
    cosmiconfig.mockImplementationOnce(() => Promise.resolve({ config }))
    await lintStaged(undefined, logger)
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should load config file when specified', async () => {
    await lintStaged(path.join(__dirname, '__mocks__', 'my-config.json'), logger)
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should print helpful error message when config file is not found', async () => {
    cosmiconfig.mockImplementationOnce(() => Promise.resolve(null))
    await lintStaged(undefined, logger)
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should print helpful error message when explicit config file is not found', async () => {
    const nonExistentConfig = 'fake-config-file.yml'

    // Serialize Windows, Linux and MacOS paths consistently
    expect.addSnapshotSerializer(
      replaceSerializer(
        /Error: ENOENT: no such file or directory, open '([^']+)'/,
        `Error: ENOENT: no such file or directory, open '${nonExistentConfig}'`
      )
    )

    await lintStaged(nonExistentConfig, logger)
    expect(logger.printHistory()).toMatchSnapshot()
  })
})
