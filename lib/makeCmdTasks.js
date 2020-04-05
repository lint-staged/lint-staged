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
 */
module.exports = async function makeCmdTasks({ commands, files, gitDir, shell }) {
  debug('Creating listr tasks for commands %o', commands)
  const commandArray = Array.isArray(commands) ? commands : [commands]
  const cmdTasks = []

  for (const cmd of commandArray) {
    // command function may return array of commands that already include `stagedFiles`
    const isFn = typeof cmd === 'function'
    const resolved = isFn ? await cmd(files) : cmd

    const resolvedArray = Array.isArray(resolved) ? resolved : [resolved] // Wrap non-array command as array

    for (const command of resolvedArray) {
      let title = isFn ? '[Function] ' : ''

      // If the function linter didn't return string | string[]  it won't work
      // Do the validation here instead of `validateConfig` to skip evaluating the function multiple times
      if (isFn && typeof command !== 'string') {
        throw new Error(
          createError(
            title.trim(),
            'Function task should return a string or an array of strings',
            resolved
          )
        )
      }

      const words = command.trim().split(' ') // Tokenize the command into words

      if (isFn) {
        const indexOfFile = words.findIndex(word => files.includes(word)) // index of first file in the command
        if (indexOfFile >= 0) {
          words.splice(indexOfFile) // Strip staged files from command
        }
      }

      // For the title, strip package runner commands (npm/npx/yarn) from the beginning
      if (words.length > 0 && ['npm', 'npx', 'yarn'].includes(words[0])) {
        let idx = 1
        while (idx < words.length && (words[idx] === '' || words[idx].startsWith('-'))) {
          idx += 1 // Remove any options to the package runner command
        }
        if (idx < words.length) {
          words.splice(0, idx) // Make sure we don't strip the entire command
        }
      }

      title += words.join(' ') // Append formatted command, like `[Function] eslint`

      cmdTasks.push({
        title,
        command,
        task: resolveTaskFn({ command, files, gitDir, isFn, shell })
      })
    }
  }

  return cmdTasks
}
