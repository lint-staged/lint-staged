/* eslint no-prototype-builtins: 0 */

'use strict'

const chalk = require('chalk')
const format = require('stringify-object')
const intersection = require('lodash/intersection')
const defaultsDeep = require('lodash/defaultsDeep')
const isArray = require('lodash/isArray')
const isBoolean = require('lodash/isBoolean')
const isFunction = require('lodash/isFunction')
const isInteger = require('lodash/isNumber')
const isObject = require('lodash/isObject')
const isString = require('lodash/isString')
const isGlob = require('is-glob')

const debug = require('debug')('lint-staged:cfg')

/**
 * Default config object
 *
 * @type {{concurrent: boolean, chunkSize: number, globOptions: {matchBase: boolean, dot: boolean}, linters: {}, subTaskConcurrency: number, renderer: string}}
 */
const defaultConfig = {
  concurrent: true,
  chunkSize: Number.MAX_SAFE_INTEGER,
  globOptions: {
    matchBase: true,
    dot: true
  },
  linters: {},
  ignore: [],
  subTaskConcurrency: 1,
  renderer: 'update',
  relative: false
}

/**
 * Check if the config is "simple" i.e. doesn't contains any of full config keys
 *
 * @param config
 * @returns {boolean}
 */
function isSimple(config) {
  return (
    isObject(config) &&
    !config.hasOwnProperty('linters') &&
    intersection(Object.keys(defaultConfig), Object.keys(config)).length === 0
  )
}

const logDeprecation = (opt, helpMsg) => `● Deprecation Warning:

  Option ${chalk.bold(opt)} was removed.

  ${helpMsg}

  Please remove ${chalk.bold(opt)} from your configuration.

Please refer to https://github.com/okonet/lint-staged#configuration for more information...`

const logUnknown = (opt, helpMsg, value) => `● Validation Warning:

  Unknown option ${chalk.bold(`"${opt}"`)} with value ${chalk.bold(
  format(value, { inlineCharacterLimit: Number.POSITIVE_INFINITY })
)} was found in the config root.

  ${helpMsg}

Please refer to https://github.com/okonet/lint-staged#configuration for more information...`

const logError = (opt, helpMsg, value) => `● Validation Error:

  Invalid value for '${chalk.bold(opt)}'.

  ${helpMsg}.
 
  Configured value is: ${chalk.bold(
    format(value, { inlineCharacterLimit: Number.POSITIVE_INFINITY })
  )}

Please refer to https://github.com/okonet/lint-staged#configuration for more information...`

/**
 * Reporter for unknown options
 * @param config
 * @param option
 * @returns {void}
 */
function unknownValidationReporter(config, option) {
  /**
   * If the unkonwn property is a glob this is probably
   * a typical mistake of mixing simple and advanced configs
   */
  if (isGlob(option)) {
    // prettier-ignore
    const message = `You are probably trying to mix simple and advanced config formats. Adding

  ${chalk.bold(`"linters": {
    "${option}": ${JSON.stringify(config[option])}
  }`)}

  will fix it and remove this message.`

    return logUnknown(option, message, config[option])
  }

  // If it is not glob pattern, simply notify of unknown value
  return logUnknown(option, '', config[option])
}

/**
 * For a given configuration object that we retrive from .lintstagedrc or package.json
 * construct a full configuration with all options set.
 *
 * This is a bit tricky since we support 2 different syntxes: simple and full
 * For simple config, only the `linters` configuration is provided.
 *
 * @param {Object} sourceConfig
 * @returns {{
 *  concurrent: boolean, chunkSize: number, globOptions: {matchBase: boolean, dot: boolean}, linters: {}, subTaskConcurrency: number, renderer: string
 * }}
 */
function getConfig(sourceConfig, debugMode) {
  debug('Normalizing config')
  const config = defaultsDeep(
    {}, // Do not mutate sourceConfig!!!
    isSimple(sourceConfig) ? { linters: sourceConfig } : sourceConfig,
    defaultConfig
  )

  // Check if renderer is set in sourceConfig and if not, set accordingly to verbose
  if (isObject(sourceConfig) && !sourceConfig.hasOwnProperty('renderer')) {
    config.renderer = debugMode ? 'verbose' : 'update'
  }

  return config
}

/**
 * Runs config validation. Throws error if the config is not valid.
 * @param config {Object}
 * @returns config {Object}
 */
function validateConfig(config) {
  debug('Validating config')

  const errors = []
  const warnings = []

  if (!isBoolean(config.concurrent)) {
    errors.push(logError('concurrent', 'Should be true or false', config.concurrent))
  }

  if (!isInteger(config.chunkSize)) {
    errors.push(logError('chunkSize', 'Should be a number', config.chunkSize))
  }

  if (isObject(config.globOptions)) {
    if (!isBoolean(config.globOptions.matchBase)) {
      errors.push(
        logError('globOptions.matchBase', 'Should be true or false', config.globOptions.matchBase)
      )
    }

    if (!isBoolean(config.globOptions.dot)) {
      errors.push(logError('globOptions.dot', 'Should be true or false', config.globOptions.dot))
    }
  } else {
    errors.push(logError('chunkSize', 'Should be a number', config.chunkSize))
  }

  if (isObject(config.linters)) {
    Object.keys(config.linters).forEach(key => {
      if (!isGlob(key)) {
        errors.push(logError(`linters[${key}]`, 'Key should be a glob pattern', key))
      }

      if (
        (!isArray(config.linters[key]) || config.linters[key].some(item => !isString(item))) &&
        !isString(config.linters[key])
      ) {
        errors.push(logError(`linters[${key}]`, 'Should be a string or an array of strings', key))
      }
    })
  } else {
    errors.push(logError('linters', 'Should be an object', config.linters))
  }

  if (!isArray(config.ignore) || config.ignore.some(item => !isString(item))) {
    errors.push(logError('ignore', 'Should be an array of strings', config.ignore))
  }

  if (!isInteger(config.subTaskConcurrency)) {
    errors.push(logError('subTaskConcurrency', 'Should be a number', config.subTaskConcurrency))
  }

  if (
    config.renderer !== 'update' &&
    config.renderer !== 'verbose' &&
    !isFunction(config.renderer)
  ) {
    errors.push(
      logError('renderer', "Should be 'update', 'verbose' or a function.", config.renderer)
    )
  }

  if (!isBoolean(config.relative)) {
    errors.push(logError('relative', 'Should be true or false', config.relative))
  }

  Object.keys(config)
    .filter(key => !defaultConfig.hasOwnProperty(key))
    .forEach(option => {
      if (option === 'gitDir') {
        warnings.push(
          logDeprecation('gitDir', "lint-staged now automatically resolves '.git' directory.")
        )
        return
      }

      if (option === 'verbose') {
        warnings.push(
          logDeprecation('verbose', `Use the command line flag ${chalk.bold('--debug')} instead.`)
        )
        return
      }

      warnings.push(unknownValidationReporter(config, option))
    })

  warnings.forEach(message => {
    console.warn(message)
  })

  if (errors.length) {
    throw new Error(errors.join('\n'))
  }

  return config
}

module.exports = {
  getConfig,
  validateConfig
}
