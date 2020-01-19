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
  const cmdTasks = []

  for (const cmd of commandsArray) {
    // command function may return array of commands that already include `stagedFiles`
    const isFn = typeof cmd === 'function'
    const resolved = isFn ? await cmd(files) : cmd

    const resolvedArray = Array.isArray(resolved) ? resolved : [resolved] // Wrap non-array command as array

    // Function command should not be used as the task title as-is
    // because the resolved string it might be very long
    // Create a matching command array with [file] in place of file names
    let mockCmdTasks
    if (isFn) {
      const mockFileList = Array(files.length).fill('[file]')
      const resolved = await cmd(mockFileList)
      mockCmdTasks = Array.isArray(resolved) ? resolved : [resolved]
    }

    for (const [i, command] of resolvedArray.entries()) {
      let title = isFn ? '[Function]' : command
      if (isFn && mockCmdTasks[i]) {
        // If command is a function, use the matching mock command as title,
        // but since might include multiple [file] arguments, shorten to one
        title = mockCmdTasks[i].replace(/\[file\].*\[file\]/, '[file]')
      }

      cmdTasks.push({
        title,
        command,
        task: resolveTaskFn({ command, files, gitDir, isFn, shell })
      })
    }
  }

  return cmdTasks
}
