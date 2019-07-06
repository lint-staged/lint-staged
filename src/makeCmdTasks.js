'use strict'

const resolveTaskFn = require('./resolveTaskFn')

const debug = require('debug')('lint-staged:make-cmd-tasks')

/**
 * Creates and returns an array of listr tasks which map to the given commands.
 *
 * @param {object} options
 * @param {Array<string|Function>|string|Function} [options.commands]
 * @param {string} [options.gitDir]
 * @param {Array<string>} [options.pathsToLint]
 * @param {Boolean} shell
 */
module.exports = async function makeCmdTasks({ commands, gitDir, pathsToLint, shell }) {
  debug('Creating listr tasks for commands %o', commands)
  const commandsArray = Array.isArray(commands) ? commands : [commands]

  return commandsArray.reduce((tasks, command) => {
    // linter function may return array of commands that already include `pathsToLit`
    const isFn = typeof command === 'function'
    const resolved = isFn ? command(pathsToLint) : command
    const linters = Array.isArray(resolved) ? resolved : [resolved] // Wrap non-array linter as array

    linters.forEach(linter => {
      const task = {
        title: linter,
        task: resolveTaskFn({ gitDir, isFn, linter, pathsToLint, shell })
      }

      tasks.push(task)
    })

    return tasks
  }, [])
}
