import debug from 'debug'

import { configurationError } from './messages.js'
import { makeErr } from './resolveTaskFn.js'

const debugLog = debug('lint-staged:makeFunctionTask')

/**
 * @type {(commands: Array<string|Function>|string|Function) => boolean}
 * @returns `true` if command is a function task
 */
export const isFunctionTask = (commands) => !Array.isArray(commands) && typeof commands === 'object'

/**
 * Handles function configuration and pushes the tasks into the task array
 *
 * @param {object} command
 * @param {Array<string>} files
 * @throws {Error} If the function configuration is not valid
 */
export const makeFunctionTask = async (command, files) => {
  debugLog('Creating Listr tasks for function %o', command)
  if (typeof command.title === 'string' && typeof command.task === 'function') {
    const task = async (ctx) => {
      try {
        await command.task(files)
      } catch (e) {
        throw makeErr(command.title, e, ctx)
      }
    }

    return [{ title: command.title, task }]
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
