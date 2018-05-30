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
    await lintStaged(logger, { config: undefined, debug: true })
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

  it('should output config in verbose mode', async () => {
    expect.assertions(1)
    const config = {
      linters: {
        '*': 'mytask'
      }
    }
    mockCosmiconfigWith({ config })
    await lintStaged(logger, { config: undefined, verbose: true })
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should output config in verbose mode + debug mode', async () => {
    expect.assertions(1)
    const config = {
      linters: {
        '*': 'mytask'
      }
    }
    mockCosmiconfigWith({ config })
    await lintStaged(logger, { config: undefined, debug: true, verbose: true })
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
    await lintStaged(logger, {
      config: path.join(__dirname, '__mocks__', 'my-config.json'),
      debug: true
    })
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should print helpful error message when config file is not found', async () => {
    expect.assertions(1)
    mockCosmiconfigWith(null)
    await lintStaged(logger, { config: '' })
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should print helpful error message when explicit config file is not found', async () => {
    expect.assertions(1)
    const nonExistentConfig = 'fake-config-file.yml'

    // Serialize Windows, Linux and MacOS paths consistently
    expect.addSnapshotSerializer(
      replaceSerializer(
        /Error: ENOENT: no such file or directory, open '([^']+)'/,
        `Error: ENOENT: no such file or directory, open '${nonExistentConfig}'`
      )
    )

    await lintStaged(logger, { config: nonExistentConfig })
    process.stdout.write(logger.printHistory())
    expect(logger.printHistory()).toMatchSnapshot()
  })
})
