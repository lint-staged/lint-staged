'use strict'

const debug = require('debug')('lint-staged:file')
const fs = require('fs')

const fsPromises = fs.promises

/**
 * Check if a file exists. Returns the filepath if exists.
 * @param {String} filepath
 */
const exists = async filepath => {
  try {
    await fsPromises.access(filepath)
    return filepath
  } catch {
    return false
  }
}

/**
 * Read contents of a file to buffer
 * @param {String} filename
 * @param {Boolean} [rejectENOENT=false] — Whether to throw if the file doesn't exist
 * @returns {Promise<Buffer|Null>}
 */
const readFile = async (filename, rejectENOENT = false) => {
  debug('Reading file `%s`', filename)
  try {
    return await fsPromises.readFile(filename)
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
 * @param {*} filepath
 */
const unlink = async filepath => {
  if (filepath) {
    await fsPromises.access(filepath)
    await fsPromises.unlink(filepath)
  }
}

/**
 * Write buffer to file
 * @param {String} filename
 * @param {Buffer} buffer
 */
const writeFile = async (filename, buffer) => {
  debug('Writing file `%s`', filename)
  await fsPromises.writeFile(filename, buffer)
}

module.exports = {
  exists,
  readFile,
  unlink,
  writeFile
}
