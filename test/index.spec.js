import { cosmiconfig } from 'cosmiconfig'
import makeConsoleMock from 'consolemock'
import path from 'path'

jest.unmock('execa')

// eslint-disable-next-line import/first
import getStagedFiles from '../lib/getStagedFiles'
// eslint-disable-next-line import/first
import lintStaged from '../lib/index'
// eslint-disable-next-line import/first
import { InvalidOptionsError } from '../lib/symbols'
// eslint-disable-next-line import/first
import validateOptions from '../lib/validateOptions'
import { replaceSerializer } from './utils/replaceSerializer'

const mockCosmiconfigWith = (result) => {
  cosmiconfig.mockImplementationOnce(() => ({
    search: () => Promise.resolve(result),
  }))
}

jest.mock('../lib/getStagedFiles')
jest.mock('../lib/gitWorkflow')
jest.mock('../lib/validateOptions', () => jest.fn().mockImplementation(async () => {}))

// TODO: Never run tests in the project's WC because this might change source files git status

describe('lintStaged', () => {
  const logger = makeConsoleMock()

  beforeEach(() => {
    logger.clearHistory()
  })

  it('should use cosmiconfig if no params are passed', async () => {
    expect.assertions(1)

    const config = { '*': 'mytask' }
    mockCosmiconfigWith({ config })

    await lintStaged(undefined, logger)

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR ✖ Failed to get staged files!"
    `)
  })

  it('should return true when passed', async () => {
    expect.assertions(1)

    getStagedFiles.mockImplementationOnce(async () => ['sample.java'])

    const config = { '*': 'node -e "process.exit(0)"' }

    await expect(lintStaged({ config, quiet: true }, logger)).resolves.toEqual(true)
  })

  it('should use use the console if no logger is passed', async () => {
    expect.assertions(2)

    mockCosmiconfigWith({ config: {} })

    const previousConsole = console
    const mockedConsole = makeConsoleMock()
    console = mockedConsole

    await expect(lintStaged()).rejects.toMatchInlineSnapshot(
      `[Error: Configuration should not be empty!]`
    )

    expect(mockedConsole.printHistory()).toMatchInlineSnapshot(`""`)

    console = previousConsole
  })

  it('should output config in debug mode', async () => {
    expect.assertions(1)

    const config = { '*': 'mytask' }
    mockCosmiconfigWith({ config })

    await lintStaged({ debug: true, quiet: true }, logger)

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      LOG Running lint-staged with the following config:
      LOG {
        '*': 'mytask'
      }"
    `)
  })

  it('should not output config in normal mode', async () => {
    expect.assertions(1)

    const config = { '*': 'mytask' }
    mockCosmiconfigWith({ config })

    await lintStaged({ quiet: true }, logger)

    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should throw when invalid options are provided', async () => {
    expect.assertions(2)

    validateOptions.mockImplementationOnce(async () => {
      throw InvalidOptionsError
    })

    await expect(lintStaged({ '*': 'mytask' }, logger)).rejects.toMatchInlineSnapshot(
      `[Error: Invalid Options]`
    )

    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should throw when invalid config is provided', async () => {
    const config = {}
    mockCosmiconfigWith({ config })

    await expect(lintStaged({ quiet: true }, logger)).rejects.toMatchInlineSnapshot(
      `[Error: Configuration should not be empty!]`
    )

    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should load config file when specified', async () => {
    expect.assertions(1)

    await lintStaged(
      {
        configPath: path.join(__dirname, '__mocks__', 'my-config.json'),
        debug: true,
        quiet: true,
      },
      logger
    )

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      LOG Running lint-staged with the following config:
      LOG {
        '*': 'mytask'
      }"
    `)
  })

  it('should parse function linter from js config', async () => {
    expect.assertions(1)

    await lintStaged(
      {
        configPath: path.join(__dirname, '__mocks__', 'advanced-config.js'),
        debug: true,
        quiet: true,
      },
      logger
    )

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      LOG Running lint-staged with the following config:
      LOG {
        '*.css': filenames => \`echo \${filenames.join(' ')}\`,
        '*.js': filenames => filenames.map(filename => \`echo \${filename}\`)
      }"
    `)
  })

  it('should use config object', async () => {
    expect.assertions(1)

    const config = { '*': 'node -e "process.exit(1)"' }

    await lintStaged({ config, quiet: true }, logger)

    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should load an npm config package when specified', async () => {
    expect.assertions(1)

    jest.mock('my-lint-staged-config')

    await lintStaged({ configPath: 'my-lint-staged-config', quiet: true, debug: true }, logger)

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      LOG Running lint-staged with the following config:
      LOG {
        '*': 'mytask'
      }"
    `)
  })

  it('should print helpful error message when config file is not found', async () => {
    expect.assertions(2)

    mockCosmiconfigWith(null)

    await expect(lintStaged({ quiet: true }, logger)).rejects.toMatchInlineSnapshot(
      `[Error: Config could not be found]`
    )

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR Config could not be found."
    `)
  })

  it('should print helpful error message when explicit config file is not found', async () => {
    expect.assertions(2)

    const nonExistentConfig = 'fake-config-file.yml'

    // Serialize Windows, Linux and MacOS paths consistently
    expect.addSnapshotSerializer(
      replaceSerializer(
        /ENOENT: no such file or directory, open '([^']+)'/,
        `ENOENT: no such file or directory, open '${nonExistentConfig}'`
      )
    )

    await expect(
      lintStaged({ configPath: nonExistentConfig, quiet: true }, logger)
    ).rejects.toThrowError()

    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })
})
