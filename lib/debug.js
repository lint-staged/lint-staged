import { formatWithOptions } from 'node:util'

import { dim, SUPPORTS_COLOR } from './colors.js'

const format = (...args) => formatWithOptions({ colors: SUPPORTS_COLOR }, ...args)

let activeLogger

export const enableDebug = (logger = console) => {
  activeLogger = logger
}

/** @param {string} name */
export const createDebug = (name) => {
  let previous = process.hrtime.bigint()

  return (...args) => {
    if (!activeLogger) return

    const now = process.hrtime.bigint()
    const ms = (now - previous) / 1_000_000n
    previous = now
    activeLogger.debug(dim(name + ': ') + format(...args) + dim(` +${ms}ms`))
  }
}
