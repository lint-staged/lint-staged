'use strict'

const getRenderer = ({ debug, quiet }, env = process.env) => {
  if (quiet) return 'silent'
  // Better support for dumb terminals: https://en.wikipedia.org/wiki/Computer_terminal#Dumb_terminals
  const isDumbTerminal = env.TERM === 'dumb'
  if (isDumbTerminal || env.NODE_ENV === 'test') return 'test'
  if (debug) return 'verbose'
  return 'update'
}

module.exports = getRenderer
