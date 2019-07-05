'use strict'

const resolveTaskFn = require('./resolveTaskFn')
const normalizeCommandConfig = require('./normalizeCommandConfig')

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
    const linters = normalizeCommandConfig(pathsToLint, command)

    linters.forEach(linter => {
      const task = {
        title: linter.title,
        task: resolveTaskFn({
          gitDir,
          shouldBeProvidedPaths: linter.shouldBeProvidedPaths,
          linter: linter.task,
          pathsToLint,
          shell
        })
      }

      tasks.push(task)
    })

    return tasks
  }, [])
}
