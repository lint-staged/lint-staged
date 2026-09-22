import { createDebug } from './debug.js'
import { getSpawnedTask } from './getSpawnedTask.js'
import { configurationError } from './messages.js'
import { isSequentialTasks } from './validateConfig.js'

const debugLog = createDebug('lint-staged:getSpawnedTasks')

/**
 * @param {import('./config.js').SequentialTasks} commands
 * @param {string[]} files
 * @param {number} [maxArgLength]
 * @param {number} [arrayDepth] the maximum depth of commands array is 2, the inner is for concurrent tasks
 * @returns
 */
const prepare = async (commands, files, maxArgLength, arrayDepth = 0) => {
  const isFunction = typeof commands === 'function'
  const resolved = isFunction ? await commands([...files]) : commands

  if (!isSequentialTasks(resolved, arrayDepth, !isFunction)) {
    throw new Error(
      configurationError(
        isFunction ? '[Function]' : '[Commands]',
        'Commands must be strings, with at most one nested array inside the sequential task list. Function results must preserve this nesting limit.',
        resolved
      )
    )
  }

  if (Array.isArray(commands)) {
    const prepared = await Promise.all(
      commands.map((command) => prepare(command, files, maxArgLength, arrayDepth + 1))
    )

    return [prepared.flat()]
  }

  /** Function tasks are meant to generate the file list themselves */
  const toCommand = (command) =>
    Array.isArray(command) ? command.map(toCommand) : { command, files: isFunction ? [] : files }

  const prepared = toCommand(resolved)

  const fits = (command) => {
    if (Array.isArray(command)) {
      return command.every(fits)
    }

    const commandLength =
      command.command.length + (command.files.length ? 1 + command.files.join(' ').length : 0)

    return commandLength <= maxArgLength
  }

  if (!maxArgLength || maxArgLength === Infinity || files.length <= 1 || fits(prepared)) {
    /** No need for chunking */
    return [prepared]
  }

  /** Split into two chunks, and try again recursively */
  const middle = Math.ceil(files.length / 2)

  debugLog('Splitting %d files for maxArgLength of %d', files.length, maxArgLength)

  const chunks = await Promise.all([
    prepare(commands, files.slice(0, middle), maxArgLength, arrayDepth),
    prepare(commands, files.slice(middle), maxArgLength, arrayDepth),
  ])

  return chunks.flat()
}

/**
 * Resolve and validate commands, preserving sequential and parallel groups.
 * Functions are reevaluated for smaller file lists when chunking is necessary.
 * Each resulting command contains only the filenames to append when spawning it.
 *
 * @param {import('./config.js').SequentialTasks} commands
 * @param {string[]} files
 * @param {number} [maxArgLength]
 * @returns {Promise<Array<{ command: string, files: string[] } | Array<{ command: string, files: string[] }>>>}
 */
export const chunkFilesForCommand = async (commands, files, maxArgLength) => {
  if (files.length === 0) return []
  const chunks = await prepare(commands, files, maxArgLength)
  return chunks.flat()
}

/**
 * Creates and returns an array of tasks which map to the given commands.
 *
 * @param {object} options
 * @param {AbortController} options.abortController
 * @param {Array<string | Function | Array<string | Function>> | string | Function} options.commands
 * @param {string} options.continueOnError
 * @param {string} options.cwd
 * @param {import('./getStagedFiles.js').StagedFile[]} options.files
 * @param {number} [options.maxArgLength]
 * @param {string} options.topLevelDir
 * @param {Boolean} verbose
 */
export const getSpawnedTasks = async ({
  abortController,
  commands,
  continueOnError,
  cwd,
  files,
  maxArgLength,
  topLevelDir,
  verbose,
}) => {
  debugLog('Creating tasks for commands %o', commands)

  const prepared = await chunkFilesForCommand(
    commands,
    files.map((file) => file.filepath),
    maxArgLength
  )

  const createTask = (command) => ({
    title: command.command,
    task: getSpawnedTask({
      abortController,
      command: command.command,
      continueOnError,
      cwd,
      files: command.files,
      topLevelDir,
      verbose,
    }),
  })

  return prepared.map((command) =>
    Array.isArray(command) ? command.map(createTask) : createTask(command)
  )
}
