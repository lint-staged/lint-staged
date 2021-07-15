/* eslint no-prototype-builtins: 0 */

'use strict'

const debug = require('debug')('lint-staged:cfg')

const { configurationError, incorrectBraces } = require('./messages')

const TEST_DEPRECATED_KEYS = new Map([
  ['concurrent', (key) => typeof key === 'boolean'],
  ['chunkSize', (key) => typeof key === 'number'],
  ['globOptions', (key) => typeof key === 'object'],
  ['linters', (key) => typeof key === 'object'],
  ['ignore', (key) => Array.isArray(key)],
  ['subTaskConcurrency', (key) => typeof key === 'number'],
  ['renderer', (key) => typeof key === 'string'],
  ['relative', (key) => typeof key === 'boolean'],
])

/**
 * Braces with a single value like `*.{js}` are invalid
 * and thus ignored by micromatch. This regex matches all occurrences of
 * two curly braces without a `,` or `..` between them, to make sure
 * users can still accidentally use them without
 * some linters never matching anything.
 *
 * For example `.{js,ts}` or `file_{1..10}` are valid but `*.{js}` is not.
 *
 * @see https://www.gnu.org/software/bash/manual/html_node/Brace-Expansion.html
 */
const BRACES_REGEXP = /({)(?:(?!,|\.\.).)*?(})/g

/**
 * Remove braces from incorrect glob patterns.
 * For example `*.{js}` is incorrect because it doesn't contain a `,` or `..`,
 * and will be reformatted as `*.js`.
 *
 * @param {string} pattern the glob pattern
 * @returns {string}
 */
const withoutIncorrectBraces = (pattern) => {
  let output = `${pattern}`
  while (BRACES_REGEXP.exec(pattern)) {
    output = output.replace(/{/, '')
    output = output.replace(/}/, '')
  }
  return output
}

/**
 * Runs config validation. Throws error if the config is not valid.
 * @param config {Object}
 * @returns config {Object}
 */
const validateConfig = (config, logger) => {
  debug('Validating config')

  if (!config || typeof config !== 'object') {
    throw new Error('Configuration should be an object!')
  }

  const errors = []

  if (Object.entries(config).length === 0) {
    throw new Error('Configuration should not be empty!')
  }

  /**
   * Create a new validated config because the keys (patterns) might change.
   * Since the Object.reduce method already loops through each entry in the config,
   * it can be used for validating the values at the same time.
   */
  const validatedConfig = Object.entries(config).reduce((collection, [pattern, task]) => {
    /** Versions < 9 had more complex configuration options that are no longer supported. */
    if (TEST_DEPRECATED_KEYS.has(pattern)) {
      const testFn = TEST_DEPRECATED_KEYS.get(pattern)
      if (testFn(task)) {
        errors.push(
          configurationError(
            pattern,
            'Advanced configuration has been deprecated. For more info, please visit: https://github.com/okonet/lint-staged',
            task
          )
        )
      }

      /** Return early for deprecated keys to skip validating their (deprecated) values */
      return collection
    }

    if (
      (!Array.isArray(task) ||
        task.some((item) => typeof item !== 'string' && typeof item !== 'function')) &&
      typeof task !== 'string' &&
      typeof task !== 'function'
    ) {
      errors.push(
        configurationError(
          pattern,
          'Should be a string, a function, or an array of strings and functions',
          task
        )
      )
    }

    /**
     * A typical configuration error is using invalid brace expansion, like `*.{js}`.
     * These are automatically fixed and warned about.
     */
    const fixedPattern = withoutIncorrectBraces(pattern)
    if (fixedPattern !== pattern) {
      logger.warn(incorrectBraces(pattern, fixedPattern))
    }

    return { ...collection, [fixedPattern]: task }
  }, {})

  if (errors.length) {
    throw new Error(errors.join('\n'))
  }

  return validatedConfig
}

module.exports = validateConfig
