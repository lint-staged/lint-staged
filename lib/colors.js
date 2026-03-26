/* eslint-disable n/no-unsupported-features/node-builtins */

import util from 'node:util'

export const SUPPORTS_COLOR = !!process.stdout.hasColors?.()

export const red = (text) => (SUPPORTS_COLOR ? util.styleText('red', text) : text)
export const yellow = (text) => (SUPPORTS_COLOR ? util.styleText('yellow', text) : text)
export const blue = (text) => (SUPPORTS_COLOR ? util.styleText('blue', text) : text)
export const dim = (text) => (SUPPORTS_COLOR ? util.styleText('dim', text) : text)
export const bold = (text) => (SUPPORTS_COLOR ? util.styleText('bold', text) : text)
