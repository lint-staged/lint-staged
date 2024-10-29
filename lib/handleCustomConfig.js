import debug from 'debug'

const debugLog = debug('lint-staged:customTask')

import { configurationError } from './messages.js'
import { makeErr } from './resolveTaskFn.js'
import { getInitialState } from './state.js'

/**
 * Handles function configuration and pushes the tasks into the task array
 *
 * @param {object} command
 * @param {Array<string>} files
 * @param {Array} cmdTasks
 * @throws {Error} If the function configuration is not valid
 */
export const handleCustomConfig = (command, files, cmdTasks) => {
  debugLog('Handling custom task %o', command)
  if (typeof command.title === 'string' && typeof command.task === 'function') {
    const task = async (ctx = getInitialState()) => {
      try {
        await command.task(files, ctx)
      } catch (e) {
        throw makeErr(command.title, e, ctx)
      }
    }
    cmdTasks.push({
      title: command.title,
      task,
    })
  } else {
    throw new Error(
      configurationError(
        '[Function]',
        'Function task should contain `title` and `task` where `title` should be string and `task` should be function.',
        command
      )
    )
  }
}
