import fsSync from 'node:fs'
import fs from 'node:fs/promises'

import debug from 'debug'

const debugLog = debug('lint-staged:file')

/**
 * Read contents of a file to buffer
 * @param {String} filename
 * @param {Boolean} [ignoreENOENT=true] — Whether to throw if the file doesn't exist
 * @returns {Promise<Buffer>}
 */
export const readFile = async (filename, ignoreENOENT = true) => {
  debugLog('Reading file `%s`', filename)
  try {
    return await fs.readFile(filename)
  } catch (error) {
    if (ignoreENOENT && error.code === 'ENOENT') {
      debugLog("File `%s` doesn't exist, ignoring...", filename)
      return null // no-op file doesn't exist
    } else {
      throw error
    }
  }
}

/**
 * Remove a file
 * @param {String} filename
 * @param {Boolean} [ignoreENOENT=true] — Whether to throw if the file doesn't exist
 */
export const unlink = async (filename, ignoreENOENT = true) => {
  debugLog('Removing file `%s`', filename)
  try {
    await fs.unlink(filename)
  } catch (error) {
    if (ignoreENOENT && error.code === 'ENOENT') {
      debugLog("File `%s` doesn't exist, ignoring...", filename)
    } else {
      throw error
    }
  }
}

/**
 * Write buffer to file
 * @param {String} filename
 * @param {Buffer} buffer
 */
export const writeFile = async (filename, buffer) => {
  debugLog('Writing file `%s`', filename)
  await fs.writeFile(filename, buffer)
}

/**
 * Rename file or directory
 * @param {String} sourcePath
 * @param {String} destinationPath
 */
export const rename = async (sourcePath, destinationPath) => {
  debugLog('Renaming file `%s` to `%s`', sourcePath, destinationPath)
  await fs.rename(sourcePath, destinationPath)
}

/**
 * Create directory
 * @param {String} directory
 */
export const mkdirSync = (directory) => {
  debugLog('Creating directory `%s`', directory)
  fsSync.mkdirSync(directory, { recursive: true })
}
