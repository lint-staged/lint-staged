import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import util from 'node:util'

import debugLib from 'debug'

import { normalizePath } from './normalizePath.js'

let logFile

/**
 * Setup "debug" lib to stream to a temporary file, and also
 * to console when enabled.
 *
 * @type {(enabled?: boolean) => string}
 */
export const setupDebugLogStream = (enabled) => {
  if (logFile) return logFile

  debugLib.enable('lint-staged*')

  const date = Date.now()
  logFile = normalizePath(path.resolve(os.tmpdir(), `lint-staged-${date}.txt`))
  const logStream = fs.createWriteStream(logFile)

  /** @see {@link https://github.com/debug-js/debug/blob/7e3814cc603bf64fdd69e714e0cf5611ec31f43b/src/node.js#L194} */
  const formatLog = (...args) =>
    util.stripVTControlCharacters(util.formatWithOptions(debugLib.inspectOpts, ...args) + '\n')

  if (enabled) {
    const defaultLog = debugLib.log

    debugLib.log = (...args) => {
      logStream.write(formatLog(...args))
      defaultLog(...args)
    }
  } else {
    debugLib.log = (...args) => {
      logStream.write(formatLog(...args))
    }
  }

  debugLib('lint-staged:setupDebugLogStream')(date)

  return logFile
}
