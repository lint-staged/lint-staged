'use strict'

const debug = require('debug')('lint-staged:file')
const fs = require('fs/promises')

/**
 * Remove a file if it exists
 * @param {String} filename
 */
const unlink = async (filename) => {
  debug('Removing file `%s`', filename)
  try {
    await fs.unlink(filename)
  } catch (error) {
    debug("File `%s` doesn't exist, ignoring...", filename)
  }
}

module.exports = unlink
