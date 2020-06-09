'use strict'

const { escape } = require('./lib/escape')

module.exports = {
  /**
   * Escape a command line argument based on the current platform
   * @param {string} arg the raw command line argument
   * @returns {string} the escaped command line argument
   */
  escape,
}
