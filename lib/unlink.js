'use strict'

const debug = require('debug')('lint-staged:file')
const fs = require('fs')
const { promisify } = require('util')

const fsUnlink = promisify(fs.unlink)

/**
 * Remove a file if it exists
 * @param {String} filename
 */
const unlink = async (filename) => {
  debug('Removing file `%s`', filename)
  try {
    await fsUnlink(filename)
  } catch (error) {
    debug("File `%s` doesn't exist, ignoring...", filename)
  }
}

module.exports = unlink
