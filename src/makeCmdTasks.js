'use strict'

const resolveTaskFn = require('./resolveTaskFn')

const debug = require('debug')('lint-staged:make-cmd-tasks')

/**
 * Creates and returns an array of listr tasks which map to the given commands.
 *
 * @param {Array<string>|string} commands
 * @param {Array<string>} pathsToLint
 * @param {Object} [options]
 */
module.exports = async function makeCmdTasks(commands, gitDir, pathsToLint) {
  debug('Creating listr tasks for commands %o', commands)

  const lintersArray = Array.isArray(commands) ? commands : [commands]

  return lintersArray.map(linter => ({
    title: linter,
    task: resolveTaskFn({
      linter,
      gitDir,
      pathsToLint
    })
  }))
}
