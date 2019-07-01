'use strict'

const resolveTaskFn = require('./resolveTaskFn')

const debug = require('debug')('lint-staged:make-cmd-tasks')

/**
 * Get title for linter task. For a function, evaluate by passing single [file].
 * For strings, return as-is
 * @param {string|Function} linter
 */
const getTitle = linter => {
  if (typeof linter === 'function') {
    const resolved = linter(['[file]'])
    return Array.isArray(resolved) ? resolved[0] : resolved
  }
  return linter
}

/**
 * Creates and returns an array of listr tasks which map to the given commands.
 *
 * @param {Array<string|Function>|string|Function} commands
 * @param {Boolean} shell
 * @param {Array<string>} pathsToLint
 * @param {Object} [options]
 */
module.exports = async function makeCmdTasks(commands, shell, gitDir, pathsToLint) {
  debug('Creating listr tasks for commands %o', commands)

  const lintersArray = Array.isArray(commands) ? commands : [commands]

  return lintersArray.map(linter => ({
    title: getTitle(linter),
    task: resolveTaskFn({
      linter,
      shell,
      gitDir,
      pathsToLint
    })
  }))
}
