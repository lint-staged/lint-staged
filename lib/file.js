import fs from 'node:fs/promises'

import { createDebug } from './debug.js'

const debugLog = createDebug('lint-staged:file')

/**
 * Ensure directory exists, creating it if not.
 * @param {string} dirname
 * @returns {Promise<string>} the dirname
 */
export const ensureDir = async (dirname) => {
  debugLog('Ensuring directory exists: %s', dirname)
  await fs.mkdir(dirname, { recursive: true })
  return dirname
}

/**
 * Try removing directory, ignoring errors
 * @param {string} dirname
 */
export const removeDir = async (dirname) => {
  debugLog('Removing directory: %s', dirname)
  try {
    await fs.rm(dirname, { recursive: true, force: true })
  } catch {}
}

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
 * Write buffer to file
 * @param {String} filename
 * @param {Buffer} buffer
 */
export const writeFile = async (filename, buffer) => {
  debugLog('Writing file `%s`', filename)
  await fs.writeFile(filename, buffer)
}
