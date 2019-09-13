'use strict'

const debug = require('debug')('lint-staged:file')
const fs = require('fs')

/**
 * Check if file exists and is accessible
 * @param {String} filename
 * @returns {Promise<Boolean>}
 */
module.exports.checkFile = filename =>
  new Promise(resolve => {
    debug('Trying to access `%s`', filename)
    fs.access(filename, fs.constants.R_OK, error => {
      if (error) {
        debug('Unable to access file `%s` with error:', filename)
        debug(error)
      } else {
        debug('Successfully accesses file `%s`', filename)
      }

      resolve(!error)
    })
  })

/**
 * @param {String} filename
 * @returns {Promise<Buffer|Null>}
 */
module.exports.readBufferFromFile = filename =>
  new Promise(resolve => {
    debug('Reading buffer from file `%s`', filename)
    fs.readFile(filename, (error, file) => {
      debug('Done reading buffer from file `%s`!', filename)
      resolve(file)
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
