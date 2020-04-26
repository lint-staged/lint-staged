'use strict'

const resolveTaskFn = require('./resolveTaskFn')
const { createError } = require('./validateConfig')

const debug = require('debug')('lint-staged:make-cmd-tasks')

/**
 * Creates and returns an array of listr tasks which map to the given commands.
 *
 * @param {object} options
 * @param {Array<string|Function>|string|Function} options.commands
 * @param {Array<string>} options.files
 * @param {string} options.gitDir
 * @param {Boolean} shell
 * @param {Boolean} verbose
 */
module.exports = async function makeCmdTasks({ commands, files, gitDir, shell, verbose }) {
  debug('Creating listr tasks for commands %o', commands)
  const commandArray = Array.isArray(commands) ? commands : [commands]
  const cmdTasks = []

  for (const cmd of commandArray) {
    // command function may return array of commands that already include `stagedFiles`
    const isFn = typeof cmd === 'function'
    const resolved = isFn ? await cmd(files) : cmd

    const resolvedArray = Array.isArray(resolved) ? resolved : [resolved] // Wrap non-array command as array

    for (const command of resolvedArray) {
      let title = isFn ? '[Function]' : command

      if (isFn) {
        // If the function linter didn't return string | string[]  it won't work
        // Do the validation here instead of `validateConfig` to skip evaluating the function multiple times
        if (typeof command !== 'string') {
          throw new Error(
            createError(
              title,
              'Function task should return a string or an array of strings',
              resolved
            )
          )
        }

        const [startOfFn] = command.split(' ')
        title += ` ${startOfFn} ...` // Append function name, like `[Function] eslint ...`
      }

      cmdTasks.push({
        title,
        command,
        task: resolveTaskFn({ command, files, gitDir, isFn, shell, verbose }),
      })
    }
  }

  return cmdTasks
}
