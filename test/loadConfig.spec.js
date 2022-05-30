import path from 'path'

import makeConsoleMock from 'consolemock'

import { loadConfig } from '../lib/loadConfig'

jest.mock('../lib/resolveConfig', () => ({
  /** Unfortunately necessary due to non-ESM tests. */
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))

jest.unmock('execa')

/**
 * This converts paths into `file://` urls, but this doesn't
 * work with `import()` when using babel + jest.
 */
jest.mock('node:url', () => ({
  pathToFileURL: (path) => path,
}))

// TODO: Never run tests in the project's WC because this might change source files git status

describe('loadConfig', () => {
  const logger = makeConsoleMock()

  beforeEach(() => {
    logger.clearHistory()
  })

  it('should load JSON config file', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      { configPath: path.join(__dirname, '__mocks__', 'my-config.json') },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      Object {
        "*": "mytask",
      }
    `)
  })

  it('should load YAML config file', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      { configPath: path.join(__dirname, '__mocks__', 'my-config.yml') },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      Object {
        "*": "mytask",
      }
    `)
  })

  it('should load CommonJS config file from absolute path', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      { configPath: path.join(__dirname, '__mocks__', 'advanced-config.js') },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      Object {
        "*.css": [Function],
        "*.js": [Function],
      }
    `)
  })

  it('should load CommonJS config file from relative path', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      { configPath: path.join('test', '__mocks__', 'advanced-config.js') },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      Object {
        "*.css": [Function],
        "*.js": [Function],
      }
    `)
  })

  it('should load CommonJS config file from .cjs file', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      { configPath: path.join('test', '__mocks__', 'my-config.cjs') },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      Object {
        "*": "mytask",
      }
    `)
  })

  it('should load EMS config file from .mjs file', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      {
        configPath: path.join('test', '__mocks__', 'esm-config.mjs'),
        debug: true,
        quiet: true,
      },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      Object {
        "*": "mytask",
      }
    `)
  })

  it('should load EMS config file from .js file', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      {
        configPath: path.join('test', '__mocks__', 'esm-config-in-js.js'),
        debug: true,
        quiet: true,
      },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      Object {
        "*": "mytask",
      }
    `)
  })

  it('should load a CJS module when specified', async () => {
    expect.assertions(1)

    jest.mock('my-lint-staged-config')

    const { config } = await loadConfig(
      { configPath: 'my-lint-staged-config', quiet: true, debug: true },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      Object {
        "*": "mytask",
      }
    `)
  })

  it('should return empty object when config file is not found', async () => {
    expect.assertions(1)

    const result = await loadConfig({ cwd: '/' })

    expect(result).toMatchInlineSnapshot(`Object {}`)
  })

  it('should return empty object when explicit config file is not found', async () => {
    expect.assertions(1)

    const result = await loadConfig({ configPath: 'fake-config-file.yml' }, logger)

    expect(result).toMatchInlineSnapshot(`Object {}`)
  })
})
