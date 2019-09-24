'use strict'

const resolveTaskFn = require('./resolveTaskFn')

const debug = require('debug')('lint-staged:make-cmd-tasks')

/**
 * Creates and returns an array of listr tasks which map to the given commands.
 *
 * @param {object} options
 * @param {Array<string|Function>|string|Function} options.commands
 * @param {Array<string>} options.files
 * @param {string} options.gitDir
 * @param {Boolean} shell
 */
module.exports = async function makeCmdTasks({ commands, files, gitDir, shell }) {
  debug('Creating listr tasks for commands %o', commands)
  const commandsArray = Array.isArray(commands) ? commands : [commands]

  return commandsArray.reduce((tasks, command) => {
    // command function may return array of commands that already include `stagedFiles`
    const isFn = typeof command === 'function'
    const resolved = isFn ? command(files) : command
    const commands = Array.isArray(resolved) ? resolved : [resolved] // Wrap non-array command as array

    for (const command of commands) {
      const task = { title: command, task: resolveTaskFn({ gitDir, isFn, command, files, shell }) }
      tasks.push(task)
    }

    return tasks
  }, [])
}
