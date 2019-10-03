'use strict'

const dedent = require('dedent')
const cosmiconfig = require('cosmiconfig')
const stringifyObject = require('stringify-object')
const printErrors = require('./printErrors')
const runAll = require('./runAll')
const validateConfig = require('./validateConfig')

const debugLog = require('debug')('lint-staged')

const errConfigNotFound = new Error('Config could not be found')

function resolveConfig(configPath) {
  try {
    return require.resolve(configPath)
  } catch (ignore) {
    return configPath
  }
}

/**
 Load configuration for lint-staged. It is used internally but also can be used
 by the user through the programming way.

 Example usage:
 * for the development tool providers, they want to figure out whether if the
   user has configured `lint-staged` if or not, use the configured one directly
   or the default configuration provided by the development tool provider
 *
 * @param {object} options
 * @param {string} [options.configPath] the path which user specify to find out
 * `lint-staged` configuration file
 * @param {boolean} [options.debug] debug mode
 * @param {Logger} [options.inputConfig] the configuration object provided by
   user directly
 * @param {Logger} [options.logger]
 *
 *
 * @example
 *
 * const { loadConfig } = require('lint-staged')
 *
 * loadConfig({ configPath: '/some/path/contains/conf' })
 *  .then((lintStagedConfig) => {
 *    if (!lintStagedConfig) {
 *      lintStagedConfig = require('./default-config')
 *    }
 *  })
 */
async function loadConfig({ logger = console, inputConfig, configPath, debug } = {}) {
  debugLog('Loading config using `cosmiconfig`')

  let result

  if (inputConfig) {
    result = { config: inputConfig, filepath: '(input)' }
  } else {
    const explorer = cosmiconfig('lint-staged', {
      searchPlaces: [
        'package.json',
        '.lintstagedrc',
        '.lintstagedrc.json',
        '.lintstagedrc.yaml',
        '.lintstagedrc.yml',
        '.lintstagedrc.js',
        'lint-staged.config.js'
      ]
    })

    result = await (configPath ? explorer.load(resolveConfig(configPath)) : explorer.search())
  }

  if (result == null) {
    throw errConfigNotFound
  }

  debugLog('Successfully loaded config from `%s`:\n%O', result.filepath, result.config)
  // result.config is the parsed configuration object
  // result.filepath is the path to the config file that was found
  const config = validateConfig(result.config, debug)
  if (debug) {
    // Log using logger to be able to test through `consolemock`.
    logger.log('Running lint-staged with the following config:')
    logger.log(stringifyObject(config, { indent: '  ' }))
  } else {
    // We might not be in debug mode but `DEBUG=lint-staged*` could have
    // been set.
    debugLog('ling-staged config:\n%O', config)
  }

  return { config, configFilePath: result.filepath }
}

/**
 * @typedef {(...any) => void} LogFunction
 * @typedef {{ error: LogFunction, log: LogFunction, warn: LogFunction }} Logger
 *
 * Root lint-staged function that is called from `bin/lint-staged`.
 *
 * @param {object} options
 * @param {string} [options.configPath] - Path to configuration file
 * @param {object}  [options.config] - Object with configuration for programmatic API
 * @param {boolean} [options.relative] - Pass relative filepaths to tasks
 * @param {boolean} [options.shell] - Skip parsing of tasks for better shell support
 * @param {boolean} [options.quiet] - Disable lint-staged’s own console output
 * @param {boolean} [options.debug] - Enable debug mode
 * @param {Logger} [logger]
 *
 * @returns {Promise<boolean>} Promise of whether the linting passed or failed
 */
async function lintStaged(
  { configPath, config, relative = false, shell = false, quiet = false, debug = false } = {},
  logger = console
) {
  try {
    config = (await loadConfig({ logger, configPath, inputConfig: config, debug })).config

    try {
      await runAll({ config, relative, shell, quiet, debug }, logger)
      debugLog('linters were executed successfully!')
      return true
    } catch (error) {
      // Errors detected, printing and exiting with non-zero
      printErrors(error, logger)
      return false
    }
  } catch (error) {
    if (error === errConfigNotFound) {
      logger.error(`${error.message}.`)
    } else {
      // It was probably a parsing error
      logger.error(dedent`
        Could not parse lint-staged config.

        ${error}
      `)
    }
    logger.error() // empty line
    // Print helpful message for all errors
    logger.error(dedent`
      Please make sure you have created it correctly.
      See https://github.com/okonet/lint-staged#configuration.
    `)
    throw error
  }
}

lintStaged.loadConfig = loadConfig
lintStaged.runAll = runAll

module.exports = lintStaged
