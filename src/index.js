'use strict'

const dedent = require('dedent')
const cosmiconfig = require('cosmiconfig')
const stringifyObject = require('stringify-object')
const printErrors = require('./printErrors')
const runAll = require('./runAll')
const validateConfig = require('./validateConfig')

const debug = require('debug')('lint-staged')

const errConfigNotFound = new Error('Config could not be found')

function resolveConfig(configPath) {
  try {
    return require.resolve(configPath)
  } catch (ignore) {
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
 * @typedef {{ error: LogFunction, log: LogFunction }} Logger
 *
 * Root lint-staged function that is called from `bin/lint-staged`.
 *
 * @param {Logger} logger
 * @param {String} configPath
 * @param {Boolean} shellMode Use execa’s shell mode to execute linter commands
 * @param {Boolean} quietMode Use Listr’s silent renderer
 * @param {Boolean} debugMode Enable debug mode
 * @returns {Promise<number>} Promise containing the exit code to use
 */
module.exports = function lintStaged(
  logger = console,
  configPath,
  shellMode = false,
  quietMode = false,
  debugMode = false
) {
  debug('Loading config using `cosmiconfig`')

  return loadConfig(configPath)
    .then(result => {
      if (result == null) throw errConfigNotFound

      debug('Successfully loaded config from `%s`:\n%O', result.filepath, result.config)
      // result.config is the parsed configuration object
      // result.filepath is the path to the config file that was found
      const config = validateConfig(result.config)
      if (debugMode) {
        // Log using logger to be able to test through `consolemock`.
        logger.log('Running lint-staged with the following config:')
        logger.log(stringifyObject(config, { indent: '  ' }))
      } else {
        // We might not be in debug mode but `DEBUG=lint-staged*` could have
        // been set.
        debug('Normalized config:\n%O', config)
      }

      return runAll(config, shellMode, quietMode, debugMode)
        .then(() => {
          debug('linters were executed successfully!')
          return Promise.resolve(0)
        })
        .catch(error => {
          printErrors(error, logger)
          return Promise.resolve(1)
        })
    })
    .catch(err => {
      if (err === errConfigNotFound) {
        logger.error(`${err.message}.`)
      } else {
        // It was probably a parsing error
        logger.error(dedent`
          Could not parse lint-staged config.

          ${err}
        `)
      }
      logger.error() // empty line
      // Print helpful message for all errors
      logger.error(dedent`
        Please make sure you have created it correctly.
        See https://github.com/okonet/lint-staged#configuration.
      `)

      return Promise.resolve(1)
    })
}
