'use strict'

const resolveTaskFn = require('./resolveTaskFn')

const debug = require('debug')('lint-staged:make-cmd-tasks')

/**
 * Creates and returns an array of listr tasks which map to the given commands.
 *
 * @param {Array<string|Function>|string|Function} commands
 * @param {Boolean} shell
 * @param {Array<string>} pathsToLint
 */
module.exports = async function makeCmdTasks(commands, shell, gitDir, pathsToLint) {
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
