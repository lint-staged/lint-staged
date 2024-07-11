import debug from 'debug'

import { configurationError } from './messages.js'
import { makeErr, resolveTaskFn } from './resolveTaskFn.js'
import { getInitialState } from './state.js'

const debugLog = debug('lint-staged:makeCmdTasks')

/**
 * Returns whether the command is a function or not and the resolved command
 *
 * @param {Function|string} cmd
 * @param {Array<string>} files
 * @returns {Object} Object containing whether the command is a function and the resolved command
 */
const getResolvedCommand = async (cmd, files) => {
  // command function may return array of commands that already include `stagedFiles`
  const isFn = typeof cmd === 'function'
  /** Pass copy of file list to prevent mutation by function from config file. */
  const resolved = isFn ? await cmd([...files]) : cmd
  return { resolved, isFn }
}

/**
 * Validates whether a command is a function and if the command is valid
 *
 * @param {string|object} command
 * @param {boolean} isFn
 * @param {string|object} resolved
 * @throws {Error} If the command is not valid
 */
const validateCommand = (command, isFn, resolved) => {
  if ((isFn && typeof command !== 'string' && typeof command !== 'object') || !command) {
    throw new Error(
      configurationError(
        '[Function]',
        'Function task should return a string or an array of strings or an object',
        resolved
      )
    )
  }
}

/**
 * Handles function configuration and pushes the tasks into the task array
 *
 * @param {object} command
 * @param {Array<string>} files
 * @param {Array} cmdTasks
 * @throws {Error} If the function configuration is not valid
 */
const handleFunctionConfig = (command, files, cmdTasks) => {
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
        'Function task should return object with title and task where title should be string and task should be function',
        command
      )
    )
  }
}

/**
 * Handles regular configuration and pushes the tasks into the task array
 *
 * @param {object} params
 * @param {Array} cmdTasks
 */
const handleRegularConfig = ({ command, cwd, files, gitDir, isFn, shell, verbose }, cmdTasks) => {
  const task = resolveTaskFn({ command, cwd, files, gitDir, isFn, shell, verbose })
  cmdTasks.push({ title: command, command, task })
}

/**
 * Ensures the input is an array. If the input is not an array, it wraps the input inside an array.
 *
 * @param {Array|string|object} input
 * @returns {Array} Returns the input as an array
 */
const ensureArray = (input) => (Array.isArray(input) ? input : [input])

/**
 * Creates and returns an array of listr tasks which map to the given commands.
 *
 * @param {object} options
 * @param {Array<string|Function>|string|Function} options.commands
 * @param {string} options.cwd
 * @param {Array<string>} options.files
 * @param {string} options.gitDir
 * @param {Boolean} shell
 * @param {Boolean} verbose
 */
export const makeCmdTasks = async ({ commands, cwd, files, gitDir, shell, verbose }) => {
  debugLog('Creating listr tasks for commands %o', commands)
  const commandArray = ensureArray(commands)
  const cmdTasks = []

  for (const cmd of commandArray) {
    const { resolved, isFn } = await getResolvedCommand(cmd, files)
    const resolvedArray = ensureArray(resolved)

    for (const command of resolvedArray) {
      validateCommand(command, isFn, resolved)

      if (typeof command === 'object') {
        handleFunctionConfig(command, files, cmdTasks)
      } else {
        handleRegularConfig({ command, cwd, files, gitDir, isFn, shell, verbose }, cmdTasks)
      }
    }
  }

  return cmdTasks
}
