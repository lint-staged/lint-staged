'use strict'

const dedent = require('dedent')
const { cosmiconfig } = require('cosmiconfig')
const stringifyObject = require('stringify-object')
const printErrors = require('./printErrors')
const runAll = require('./runAll')
const validateConfig = require('./validateConfig')

const debugLog = require('debug')('lint-staged')

const errConfigNotFound = new Error('Config could not be found')

function resolveConfig(configPath) {
  try {
    return require.resolve(configPath)
  } catch {
    return configPath
  }
}

function loadConfig(configPath) {
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

  return configPath ? explorer.load(resolveConfig(configPath)) : explorer.search()
}

/**
 * @typedef {(...any) => void} LogFunction
 * @typedef {{ error: LogFunction, log: LogFunction, warn: LogFunction }} Logger
 *
 * Root lint-staged function that is called from `bin/lint-staged`.
 *
 * @param {object} options
 * @param {Object} [options.allowEmpty] - Allow empty commits when tasks revert all staged changes
 * @param {boolean | number} [options.concurrent] - The number of tasks to run concurrently, or false to run tasks serially
 * @param {object}  [options.config] - Object with configuration for programmatic API
 * @param {string} [options.configPath] - Path to configuration file
 * @param {number} [options.maxArgLength] - Maximum argument string length
 * @param {boolean} [options.relative] - Pass relative filepaths to tasks
 * @param {boolean} [options.shell] - Skip parsing of tasks for better shell support
 * @param {boolean} [options.quiet] - Disable lint-staged’s own console output
 * @param {boolean} [options.debug] - Enable debug mode
 * @param {boolean | number} [options.concurrent] - The number of tasks to run concurrently, or false to run tasks serially
 * @param {Logger} [logger]
 *
 * @returns {Promise<boolean>} Promise of whether the linting passed or failed
 */
module.exports = async function lintStaged(
  {
    allowEmpty = false,
    concurrent = true,
    config: configObject,
    configPath,
    maxArgLength,
    relative = false,
    shell = false,
    quiet = false,
    debug = false
  } = {},
  logger = console
) {
  try {
    debugLog('Loading config using `cosmiconfig`')

    const resolved = configObject
      ? { config: configObject, filepath: '(input)' }
      : await loadConfig(configPath)
    if (resolved == null) throw errConfigNotFound

    debugLog('Successfully loaded config from `%s`:\n%O', resolved.filepath, resolved.config)
    // resolved.config is the parsed configuration object
    // resolved.filepath is the path to the config file that was found
    const config = validateConfig(resolved.config)
    if (debug) {
      // Log using logger to be able to test through `consolemock`.
      logger.log('Running lint-staged with the following config:')
      logger.log(stringifyObject(config, { indent: '  ' }))
    } else {
      // We might not be in debug mode but `DEBUG=lint-staged*` could have
      // been set.
      debugLog('lint-staged config:\n%O', config)
    }

    try {
      await runAll(
        { allowEmpty, concurrent, config, debug, maxArgLength, quiet, relative, shell },
        logger
      )
      debugLog('tasks were executed successfully!')
      return true
    } catch (runAllError) {
      printErrors(runAllError, logger)
      return false
    }
  } catch (lintStagedError) {
    if (lintStagedError === errConfigNotFound) {
      logger.error(`${lintStagedError.message}.`)
    } else {
      // It was probably a parsing error
      logger.error(dedent`
        Could not parse lint-staged config.

        ${lintStagedError}
      `)
    }
    logger.error() // empty line
    // Print helpful message for all errors
    logger.error(dedent`
      Please make sure you have created it correctly.
      See https://github.com/okonet/lint-staged#configuration.
    `)

    throw lintStagedError
  }
}
