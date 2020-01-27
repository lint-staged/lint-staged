'use strict'

const debug = require('debug')('lint-staged:file')
const fs = require('fs')

const fsPromises = fs.promises

/**
 * Check if a file exists. Returns the filepath if exists.
 * @param {string} filepath
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
 * @param {String} filename
 * @returns {Promise<Buffer|Null>}
 */
const readBufferFromFile = (filename, rejectENOENT = false) =>
  new Promise(resolve => {
    debug('Reading buffer from file `%s`', filename)
    fs.readFile(filename, (error, buffer) => {
      if (!rejectENOENT && error && error.code === 'ENOENT') {
        debug("File `%s` doesn't exist, ignoring...", filename)
        return resolve(null) // no-op file doesn't exist
      }
      debug('Done reading buffer from file `%s`!', filename)
      resolve(buffer)
    })
  })

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
 * @param {String} filename
 * @param {Buffer} buffer
 * @returns {Promise<Void>}
 */
const writeBufferToFile = (filename, buffer) =>
  new Promise(resolve => {
    debug('Writing buffer to file `%s`', filename)
    fs.writeFile(filename, buffer, () => {
      debug('Done writing buffer to file `%s`!', filename)
      resolve()
    })
  })

module.exports = {
  exists,
  readBufferFromFile,
  unlink,
  writeBufferToFile
}
