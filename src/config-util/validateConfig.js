'use strict'

const chalk = require('chalk')
const format = require('stringify-object')
const jestValidate = require('jest-validate')
const unknownOptionWarning = require('jest-validate/build/warnings').unknownOptionWarning
const isGlob = require('is-glob')
const defaultConfig = require('./defaultConfig')

const validate = jestValidate.validate
const logValidationWarning = jestValidate.logValidationWarning

/**
 * Custom jest-validate reporter for unknown options
 * @param config
 * @param example
 * @param option
 * @param options
 * @returns {void}
 */
function unknownValidationReporter(config, example, option, options) {
  /**
   * If the unkonwn property is a glob this is probably
   * a typical mistake of mixing simple and advanced configs
   */
  if (isGlob(option)) {
    const message = `  Unknown option ${chalk.bold(`"${option}"`)} with value ${chalk.bold(
      format(config[option], { inlineCharacterLimit: Number.POSITIVE_INFINITY })
    )} was found in the config root.

  You are probably trying to mix simple and advanced config formats. Adding

  ${chalk.bold(`"linters": {
    "${option}": ${JSON.stringify(config[option])}
  }`)}

  will fix it and remove this message.`

    const comment = options.comment
    const name = (options.title && options.title.warning) || 'WARNING'
    return logValidationWarning(name, message, comment)
  }
  // If it is not glob pattern, use default jest-validate reporter
  return unknownOptionWarning(config, example, option, options)
}

/**
 * Runs config validation. Throws error if the config is not valid.
 * @param config {Object}
 * @returns config {Object}
 */
module.exports = function validateConfig(config) {
  const exampleConfig = Object.assign({}, defaultConfig, {
    linters: [
      { filtes: ['*.js'], commands: ['eslint --fix', 'git add'] },
      { filtes: ['*.css'], commands: 'stylelint' }
    ]
  })

  const validation = validate(config, {
    exampleConfig,
    unknown: unknownValidationReporter,
    comment:
      'Please refer to https://github.com/okonet/lint-staged#configuration for more information...'
  })

  if (!validation.isValid) {
    throw new Error('lint-staged config is invalid... Aborting.')
  }

  return config
}
