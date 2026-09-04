import util from 'node:util'

export let COLORS_ENABLED = false

/** Node.js util checks for FORCE_COLOR/NO_COLOR and whether TTY supports ANSI colors */
export const supportsColors = (stream = process.stdout) =>
  util.styleText('red', 'test', { stream }) !== 'test'

/** @param {boolean} [enabled] */
export const enableColors = (enabled) => {
  COLORS_ENABLED = !!enabled
}

/**
 * @param {util.InspectColor | readonly util.InspectColor[]} format
 * @returns {(text: string) => string}
 */
const styleText = (format) => (text) =>
  COLORS_ENABLED ? util.styleText(format, text, { validateStream: false }) : text

export const green = styleText('green')

export const red = styleText('red')

export const yellow = styleText('yellow')

export const blue = styleText('blue')

export const dim = styleText('dim')

export const bold = styleText('bold')
