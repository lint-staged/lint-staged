'use strict'

const dedent = require('dedent')
const cosmiconfig = require('cosmiconfig')
const stringifyObject = require('stringify-object')
const { getConfig, validateConfig } = require('./getConfig')
const printErrors = require('./printErrors')
const runAll = require('./runAll')

const debug = require('debug')('lint-staged')

// Force colors for packages that depend on https://www.npmjs.com/package/supports-color
// but do this only in TTY mode
if (process.stdout.isTTY) {
  process.env.FORCE_COLOR = true
}

const errConfigNotFound = new Error('Config could not be found')

/**
 * Root lint-staged function that is called from .bin
 */
module.exports = function lintStaged(logger = console, configPath, debugMode) {
  debug('Loading config using `cosmiconfig`')

  const explorer = cosmiconfig('lint-staged', {
    configPath,
    rc: '.lintstagedrc',
    rcExtensions: true
  })

  return explorer
    .load()
    .then(result => {
      if (result == null) throw errConfigNotFound

      debug('Successfully loaded config from `%s`:\n%O', result.filepath, result.config)
      // result.config is the parsed configuration object
      // result.filepath is the path to the config file that was found
      const config = validateConfig(getConfig(result.config, debugMode))
      if (debugMode) {
        // Log using logger to be able to test through `consolemock`.
        logger.log('Running lint-staged with the following config:')
        logger.log(stringifyObject(config, { indent: '  ' }))
      } else {
        // We might not be in debug mode but `DEBUG=lint-staged*` could have
        // been set.
        debug('Normalized config:\n%O', config)
      }

      runAll(config)
        .then(() => {
          debug('linters were executed successfully!')
          // No errors, exiting with 0
          process.exitCode = 0
        })
        .catch(error => {
          // Errors detected, printing and exiting with non-zero
          printErrors(error)
          process.exitCode = 1
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
      process.exitCode = 1
    })
}
