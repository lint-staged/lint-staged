'use strict'

const debug = require('debug')('lint-staged:file')
const fs = require('fs')

/**
 * @param {String} filename
 * @returns {Promise<Buffer|Null>}
 */
module.exports.readBufferFromFile = (filename, rejectENOENT = false) =>
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
 * @param {String} filename
 * @param {Buffer} buffer
 * @returns {Promise<Void>}
 */
module.exports.writeBufferToFile = (filename, buffer) =>
  new Promise(resolve => {
    debug('Writing buffer to file `%s`', filename)
    fs.writeFile(filename, buffer, () => {
      debug('Done writing buffer to file `%s`!', filename)
      resolve()
    })
  })
