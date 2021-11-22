import path from 'path'

import { lilconfig } from 'lilconfig'
import makeConsoleMock from 'consolemock'

jest.unmock('execa')

import { getStagedFiles } from '../lib/getStagedFiles'
import lintStaged from '../lib/index'
import { InvalidOptionsError } from '../lib/symbols'
import { validateOptions } from '../lib/validateOptions'

import { replaceSerializer } from './utils/replaceSerializer'

const mockLilConfig = (result) => {
  lilconfig.mockImplementationOnce(() => ({
    search: () => Promise.resolve(result),
  }))
}

/**
 * This converts paths into `file://` urls, but this doesn't
 * work with `import()` when using babel + jest.
 */
jest.mock('url', () => ({
  pathToFileURL: (path) => path,
}))

jest.mock('../lib/getStagedFiles')
jest.mock('../lib/gitWorkflow')
jest.mock('../lib/validateOptions', () => ({
  validateOptions: jest.fn().mockImplementation(async () => {}),
}))

// TODO: Never run tests in the project's WC because this might change source files git status

describe('lintStaged', () => {
  const logger = makeConsoleMock()

  beforeEach(() => {
    logger.clearHistory()
  })

  it('should use lilconfig if no params are passed', async () => {
    expect.assertions(1)

    const config = { '*': 'mytask' }
    mockLilConfig({ config })

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

    mockLilConfig({ config: {} })

    const previousConsole = console
    const mockedConsole = makeConsoleMock()
    console = mockedConsole

    await expect(lintStaged()).rejects.toMatchInlineSnapshot(
      `[Error: Configuration should not be empty]`
    )

    expect(mockedConsole.printHistory()).toMatchInlineSnapshot(`""`)

    console = previousConsole
  })

  it('should output config in debug mode', async () => {
    expect.assertions(1)

    const config = { '*': 'mytask' }
    mockLilConfig({ config })

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
    mockLilConfig({ config })

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
    mockLilConfig({ config })

    await expect(lintStaged({ quiet: true }, logger)).rejects.toMatchInlineSnapshot(
      `[Error: Configuration should not be empty]`
    )

    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should load JSON config file', async () => {
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

  it('should load YAML config file', async () => {
    expect.assertions(1)

    await lintStaged(
      {
        configPath: path.join(__dirname, '__mocks__', 'my-config.yml'),
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

  it('should load CommonJS config file from absolute path', async () => {
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
        '*.css': [Function: *.css],
        '*.js': [Function: *.js]
      }"
    `)
  })

  it('should load CommonJS config file from relative path', async () => {
    expect.assertions(1)

    await lintStaged(
      {
        configPath: path.join('test', '__mocks__', 'advanced-config.js'),
        debug: true,
        quiet: true,
      },
      logger
    )

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      LOG Running lint-staged with the following config:
      LOG {
        '*.css': [Function: *.css],
        '*.js': [Function: *.js]
      }"
    `)
  })

  it('should load CommonJS config file from .cjs file', async () => {
    expect.assertions(1)

    await lintStaged(
      {
        configPath: path.join('test', '__mocks__', 'my-config.cjs'),
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

  it('should load EMS config file from .mjs file', async () => {
    expect.assertions(1)

    await lintStaged(
      {
        configPath: path.join('test', '__mocks__', 'esm-config.mjs'),
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

  it('should load EMS config file from .js file', async () => {
    expect.assertions(1)

    await lintStaged(
      {
        configPath: path.join('test', '__mocks__', 'esm-config-in-js.js'),
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

  it('should use config object', async () => {
    expect.assertions(1)

    const config = { '*': 'node -e "process.exit(1)"' }

    await lintStaged({ config, quiet: true }, logger)

    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })

  it('should load a CJS module when specified', async () => {
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

    mockLilConfig(null)

    await expect(lintStaged({ quiet: true }, logger)).rejects.toMatchInlineSnapshot(
      `[Error: Configuration could not be found]`
    )

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR Configuration could not be found."
    `)
  })

  it('should print helpful error message when explicit config file is not found', async () => {
    expect.assertions(3)

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

    expect(logger.printHistory()).toMatch('ENOENT')
    expect(logger.printHistory()).toMatch('Configuration could not be found')
  })
})
