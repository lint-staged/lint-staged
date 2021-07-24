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
 * A correctly-formed brace expansion must contain unquoted opening and closing braces,
 * and at least one unquoted comma or a valid sequence expression.
 * Any incorrectly formed brace expansion is left unchanged.
 *
 * @see https://www.gnu.org/software/bash/manual/html_node/Brace-Expansion.html
 *
 * Lint-staged uses `micromatch` for brace expansion, and its behavior is to treat
 * invalid brace expansions as literal strings, which means they (typically) do not match
 * anything.
 *
 * This RegExp tries to match most cases of invalid brace expansions, so that they can be
 * detected, warned about, and re-formatted by removing the braces and thus hopefully
 * matching the files as intended by the user. The only real fix is to remove the incorrect
 * braces from user configuration, but this is left to the user (after seeing the warning).
 *
 * @example <caption>Globs with brace expansions</caption>
 * - *.{js,tx}         // expanded as *.js, *.ts
 * - file_{1..10}.css  // expanded as file_1.css, file_2.css, …, file_10.css
 *
 * @example <caption>Globs with incorrect brace expansions</caption>
 * - *.{js}     // should just be *.js
 * - *.\{js\}   // escaped braces, so they're treated literally
 * - *.${js}    // dollar-sign inhibits expansion, so treated literally
 * - *.{js\,ts} // the comma is escaped, so treated literally
 */
const BRACES_REGEXP = new RegExp(/(?<![\\$])({)(?:(?!(?<!\\),|\.\.).)*?(?<!\\)(})/g)

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

  BRACES_REGEXP.lastIndex = 0 /** Reset lastIndex */

  return output
}

/**
 * Runs config validation. Throws error if the config is not valid.
 * @param config {Object}
 * @returns config {Object}
 */
const validateConfig = (config, logger) => {
  debug('Validating config')

  if (!config || (typeof config !== 'object' && typeof config !== 'function')) {
    throw new Error('Configuration should be an object or a function!')
  }

  /**
   * Function configurations receive all staged files as their argument.
   * They are not further validated here to make sure the function gets
   * evaluated only once.
   *
   * @see makeCmdTasks
   */
  if (typeof config === 'function') {
    return { '*': config }
  }

  if (Object.entries(config).length === 0) {
    throw new Error('Configuration should not be empty!')
  }

  const errors = []

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
          configurationError(pattern, 'Advanced configuration has been deprecated.', task)
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
          'Should be a string, a function, or an array of strings and functions.',
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
    const message = errors.join('\n\n')

    logger.error(`Could not parse lint-staged config.

${message}

See https://github.com/okonet/lint-staged#configuration.`)

    throw new Error(message)
  }

  return validatedConfig
}

module.exports = validateConfig

module.exports.BRACES_REGEXP = BRACES_REGEXP
