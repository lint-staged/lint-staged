import path from 'path'
import { fileURLToPath } from 'url'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import { loadConfig } from '../lib/loadConfig.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('loadConfig', () => {
  const logger = makeConsoleMock()

  beforeEach(() => {
    logger.clearHistory()
  })

  it('should load JSON config file', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      { configPath: path.join(__dirname, 'fixtures', 'my-config.json') },
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
      { configPath: path.join(__dirname, 'fixtures', 'my-config.yml') },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      Object {
        "*": "mytask",
      }
    `)
  })

  it('should load CommonJS config file from absolute .cjs file', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      { configPath: path.join(__dirname, 'fixtures', 'my-config.cjs') },
      logger
    )

    expect(config).toMatchInlineSnapshot(`
      Object {
        "*": "mytask",
      }
    `)
  })

  it('should load CommonJS config file from relative .cjs file', async () => {
    expect.assertions(1)

    const { config } = await loadConfig(
      { configPath: path.join('test', 'fixtures', 'my-config.cjs') },
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
        configPath: path.join('test', 'fixtures', 'esm-config.mjs'),
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
        configPath: path.join('test', 'fixtures', 'esm-config-in-js.js'),
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
