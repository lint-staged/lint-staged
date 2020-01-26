'use strict'

const debug = require('debug')('lint-staged:file')
const fs = require('fs').promises

/**
 * Check if a file exists. Returns the filename if exists.
 * @param {String} filename
 * @returns {String|Boolean}
 */
const exists = async filename => {
  try {
    await fs.access(filename)
    return filename
  } catch {
    return false
  }
}

/**
 * Read contents of a file to buffer
 * @param {String} filename
 * @param {Boolean} [rejectENOENT=false] — Whether to throw if the file doesn't exist
 * @returns {Promise<Buffer>}
 */
const readFile = async (filename, rejectENOENT = false) => {
  debug('Reading file `%s`', filename)
  try {
    return await fs.readFile(filename)
  } catch (error) {
    if (!rejectENOENT && error.code === 'ENOENT') {
      debug("File `%s` doesn't exist, ignoring...", filename)
      return null // no-op file doesn't exist
    }
    throw error
  }
}

/**
 * Unlink a file if it exists
 * @param {String} filename
 */
const unlink = async filename => {
  if (filename) {
    await fs.access(filename)
    await fs.unlink(filename)
  }
}

/**
 * Write buffer to file
 * @param {String} filename
 * @param {Buffer} buffer
 */
const writeFile = async (filename, buffer) => {
  debug('Writing file `%s`', filename)
  await fs.writeFile(filename, buffer)
}

module.exports = {
  exists,
  readFile,
  unlink,
  writeFile
}
