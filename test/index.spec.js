import makeConsoleMock from 'consolemock'
import cosmiconfig from 'cosmiconfig'
import path from 'path'
import lintStaged from '../src/index'

const replaceSerializer = (from, to) => ({
  test: val => typeof val === 'string' && from.test(val),
  print: val => val.replace(from, to)
})

const mockCosmiconfigWith = result => {
  cosmiconfig.mockImplementationOnce(() => ({
    search: () => Promise.resolve(result)
  }))
}

jest.mock('../src/gitWorkflow')

// TODO: Never run tests in the project's WC because this might change source files git status

describe('lintStaged', () => {
  const logger = makeConsoleMock()

  beforeEach(() => {
    logger.clearHistory()
  })

  it('should output config in debug mode', async () => {
    expect.assertions(1)
    const config = {
      linters: {
        '*': 'mytask'
      }
    }
    mockCosmiconfigWith({ config })
    await lintStaged(logger, undefined, true)
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should not output config in normal mode', async () => {
    expect.assertions(1)
    const config = {
      '*': 'mytask'
    }
    mockCosmiconfigWith({ config })
    await lintStaged(logger)
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should load config file when specified', async () => {
    expect.assertions(1)
    await lintStaged(logger, path.join(__dirname, '__mocks__', 'my-config.json'), true)
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should load an npm config package when specified', async () => {
    expect.assertions(1)
    jest.mock('my-lint-staged-config')
    await lintStaged(logger, 'my-lint-staged-config', true)
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should print helpful error message when config file is not found', async () => {
    expect.assertions(2)
    mockCosmiconfigWith(null)
    await lintStaged(logger)
    expect(logger.printHistory()).toMatchSnapshot()
    expect(process.exitCode).toEqual(1)
  })

  it('should print helpful error message when explicit config file is not found', async () => {
    expect.assertions(2)
    const nonExistentConfig = 'fake-config-file.yml'

    // Serialize Windows, Linux and MacOS paths consistently
    expect.addSnapshotSerializer(
      replaceSerializer(
        /Error: ENOENT: no such file or directory, open '([^']+)'/,
        `Error: ENOENT: no such file or directory, open '${nonExistentConfig}'`
      )
    )

    await lintStaged(logger, nonExistentConfig)
    expect(logger.printHistory()).toMatchSnapshot()
    expect(process.exitCode).toEqual(1)
  })
})
