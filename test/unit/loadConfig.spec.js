import fs from 'node:fs/promises'
import path from 'node:path'

import makeConsoleMock from 'consolemock'

import { loadConfig } from '../../lib/loadConfig.js'

/** Unfortunately necessary due to non-ESM tests. */
jest.mock('../../lib/resolveConfig.js', () => ({
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))

/**
 * This converts paths into `file://` urls, but this doesn't
 * work with `import()` when using babel + jest.
 */
jest.mock('node:url', () => ({
  pathToFileURL: (path) => path,
}))

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
      {
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
      {
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
      {
        "*.css": [Function],
        "*.js": [Function],
      }
    `)
  })

  it('should load CommonJS config file from relative path', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      { configPath: path.join('test', 'unit', '__mocks__', 'advanced-config.js') },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      {
        "*.css": [Function],
        "*.js": [Function],
      }
    `)
  })

  it('should load CommonJS config file from .cjs file', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      { configPath: path.join('test', 'unit', '__mocks__', 'cjs', 'my-config.cjs') },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      {
        "*": "mytask",
      }
    `)
  })

  it('should load EMS config file from .mjs file', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      {
        configPath: path.join('test', 'unit', '__mocks__', 'esm-config.mjs'),
        debug: true,
        quiet: true,
      },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      {
        "*": "mytask",
      }
    `)
  })

  it('should load EMS config file from .js file', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      {
        configPath: path.join('test', 'unit', '__mocks__', 'esm-config-in-js.js'),
        debug: true,
        quiet: true,
      },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      {
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
      {
        "*": "mytask",
      }
    `)
  })

  it('should return empty object when config file is not found', async () => {
    expect.assertions(1)

    const result = await loadConfig({ cwd: '/' })

    expect(result).toMatchInlineSnapshot(`{}`)
  })

  it('should return empty object when explicit config file is not found', async () => {
    expect.assertions(1)

    const result = await loadConfig({ configPath: 'fake-config-file.yml' }, logger)

    expect(result).toMatchInlineSnapshot(`{}`)
  })

  it('should return empty object ".lintstagedrc.json" file is invalid', async () => {
    expect.assertions(1)

    const configFile = path.join(__dirname, '__mocks__', '.lintstagedrc.json')

    await fs.writeFile(configFile, '{')

    const result = await loadConfig({ configPath: configFile }, logger)

    expect(result).toMatchInlineSnapshot(`{}`)

    await fs.rm(configFile)
  })

  it('should return null config when package.json file is invalid', async () => {
    expect.assertions(1)

    const configFile = path.join(__dirname, '__mocks__', 'package.json')

    await fs.writeFile(configFile, '{')

    const { config } = await loadConfig({ configPath: configFile }, logger)

    expect(config).toBeNull()

    await fs.rm(configFile)
  })

  it('should read "lint-staged" key from package.yaml', async () => {
    expect.assertions(1)

    const configFile = path.join(__dirname, '__mocks__', 'package.yaml')

    await fs.writeFile(configFile, 'lint-staged:\n  "*": mytask')

    const { config } = await loadConfig({ configPath: configFile }, logger)

    expect(config).toMatchInlineSnapshot(`
      {
        "*": "mytask",
      }
    `)
  })

  it('should read "lint-staged" key from package.yml', async () => {
    expect.assertions(1)

    const configFile = path.join(__dirname, '__mocks__', 'package.yml')

    await fs.writeFile(configFile, 'lint-staged:\n  "*": mytask')

    const { config } = await loadConfig({ configPath: configFile }, logger)

    expect(config).toMatchInlineSnapshot(`
      {
        "*": "mytask",
      }
    `)
  })

  it('should return null config when package.yaml file is invalid', async () => {
    expect.assertions(1)

    const configFile = path.join(__dirname, '__mocks__', 'package.yaml')

    await fs.writeFile(configFile, '{')

    const { config } = await loadConfig({ configPath: configFile }, logger)

    expect(config).toBeUndefined()

    await fs.rm(configFile)
  })
})
