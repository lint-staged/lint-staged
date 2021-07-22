const { promises: fs, constants } = require('fs')

const { invalidOption } = require('./messages')
const { InvalidOptionsError } = require('./symbols')

const debug = require('debug')('lint-staged:options')

/**
 * Validate lint-staged options, either from the Node.js API or the command line flags.
 * @param {*} options
 * @param {boolean|string} [options.shell] - Skip parsing of tasks for better shell support
 *
 * @throws {InvalidOptionsError}
 */
const validateOptions = async (options = {}, logger) => {
  debug('Validating options...')

  /** Ensure the passed shell option is executable */
  if (typeof options.shell === 'string') {
    try {
      await fs.access(options.shell, constants.X_OK)
    } catch (error) {
      logger.error(invalidOption('shell', options.shell, error.message))
      throw InvalidOptionsError
    }
  }

  debug('Validated options!')
}

module.exports = validateOptions
