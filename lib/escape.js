'use strict'

/**
 * Escape a shell argument for Unix shells:
 * - Escape all weird characters with `\`
 * - Double-escape spaces for execa (`\\ `)
 * @see https://qntm.org/cmd
 * @see https://github.com/sindresorhus/execa/blob/a827d82203a1440e585276bef5d399a5953801f1/lib/command.js#L20
 * @param {string} arg the argument
 * @returns {string} the escaped argument
 */
const escapeUnixShellArg = (arg) =>
  `${arg.replace(/([^a-zA-Z0-9_])/g, '\\$1').replace(/( )/g, '\\$1')}`

/**
 * Temporary no-op function.
 * @todo Actually figure out how to escape paths on Windows
 *
 * @param {string} arg the argument
 * @returns {string} the same argument
 */
const escapeWinCmdArg = (arg) => arg

const currentPlatform = process.platform

/**
 * "Internally" expose the platform option for testing
 * @param {string} arg the argument
 * @param {string} [platform] the current platform
 */
const escapeArg = (arg, platform = currentPlatform) => {
  const isWin = platform === 'win32'
  return isWin ? escapeWinCmdArg(arg) : escapeUnixShellArg(arg)
}

/**
 * Escape a command line argument based on the current platform
 * @param {string} arg the raw command line argument
 * @returns {string} the escaped command line argument
 */
const escape = (arg) => escapeArg(arg)

module.exports = {
  escape,
  escapeArg,
  escapeUnixShellArg,
  escapeWinCmdArg,
}
