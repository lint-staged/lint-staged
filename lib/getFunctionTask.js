import { format } from 'node:util'

import { createDebug } from './debug.js'
import { Signal } from './getAbortController.js'
import { createTaskError, handleTaskOutput } from './getSpawnedTask.js'

const debugLog = createDebug('lint-staged:getFunctionTasks')

/**
 * @typedef {{ title: string; task: Function }} FunctionTask
 * @type {(commands: FunctionTask|Array<string|Function>|string|Function) => boolean}
 * @returns `true` if command is a function task
 */
export const isFunctionTask = (commands) => typeof commands === 'object' && !Array.isArray(commands)

/**
 * Handles function configuration and pushes the tasks into the task array
 *
 * @param {object} options
 * @param {AbortController} options.abortController
 * @param {FunctionTask} options.command
 * @param {boolean} options.continueOnError
 * @param {import('./getStagedFiles.js').StagedFile[]} options.files
 * @param {boolean} [options.verbose]
 * @throws {Error} If the function configuration is not valid
 */
export const getFunctionTask = async ({
  abortController,
  command,
  continueOnError,
  files,
  verbose,
}) => {
  debugLog('Creating task for function %o', command)

  const task = async (ctx) => {
    const output = []
    const addOutput = (...args) => {
      output.push(format(...args))
    }

    try {
      const filepaths = files.map((file) => file.filepath)

      await command.task(filepaths, { log: addOutput })
    } catch (error) {
      if (continueOnError !== true) {
        /** Other tasks should be killed */
        abortController.abort(Signal.SIGKILL)
      }

      addOutput(`\n%O`, error)

      const taskOutput = output.join('\n').trimEnd()
      handleTaskOutput(command.title, taskOutput, ctx, undefined, error)

      throw createTaskError(command.title, error, ctx)
    }

    if (verbose) {
      handleTaskOutput(command.title, output.join('\n').trimEnd(), ctx)
    }
  }

  return [
    {
      title: command.title,
      task,
    },
  ]
}
