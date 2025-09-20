/* eslint-disable n/no-unsupported-features/node-builtins */

import util from 'node:util'

export const red = (text) => util.styleText('red', text)
export const yellow = (text) => util.styleText('yellow', text)
export const blue = (text) => util.styleText('blue', text)
export const blackBright = (text) => util.styleText('blackBright', text)
export const bold = (text) => util.styleText('bold', text)

/** @returns `true` if Node.js `util.styleText()` returns formatted text */
export const SUPPORTS_COLOR = red('red', 'test') !== 'test'
