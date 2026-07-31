import { createDebug } from './debug.js'
import { getSpawnedTask } from './getSpawnedTask.js'
import { configurationError } from './messages.js'

const debugLog = createDebug('lint-staged:getSpawnedTasks')

/**
 * Get the maximum length of a command-line argument string based on current platform
 *
 * https://serverfault.com/questions/69430/what-is-the-maximum-length-of-a-command-line-in-mac-os-x
 * https://support.microsoft.com/en-us/help/830473/command-prompt-cmd-exe-command-line-string-limitation
 * https://unix.stackexchange.com/a/120652
 */
export const getMaxArgLength = (platform = process.platform) => {
  switch (platform) {
    case 'darwin':
      return 262_144
    case 'win32':
      return 8_191
    default:
      return 131_072
  }
}

/**
 * Chunk `files` so that when joined with `command`, the resulting string fits into `maxArgLength`.
 * For function commands, they are evaluated with the list of files and measured afterwards.
 *
 * @param {string | Function} command
 * @param {string[]} files
 * @param {number} [maxArgLength]
 * @returns {Promise<Array<{ command: string, files: string[] }>>}
 */
export const chunkFilesForCommand = async (command, files, maxArgLength) => {
  const isFn = typeof command === 'function'
  const resolved = isFn ? await command([...files]) : command
  const resolvedCommands = Array.isArray(resolved) ? resolved : [resolved]

  if (isFn && resolvedCommands.some((c) => typeof c !== 'string')) {
    throw new Error(
      configurationError(
        '[Function]',
        'Function task should return a string or an array of strings',
        resolved
      )
    )
  }

  if (!maxArgLength || maxArgLength === Infinity || files.length <= 1) {
    debugLog(
      'Skipping chunking because maxArgLength is %s and there are %s files',
      maxArgLength,
      files.length
    )

    return resolvedCommands.map((resolvedCommand) => ({
      command: resolvedCommand,
      files,
    }))
  }

  const fits = resolvedCommands.every((resolvedCommand) => {
    /**
     * Really the command is spawned using `tinyexec` and the files passed as an array of
     * arguments; but this approximates the length without quoting filenames.
     */
    const finalCommandString = isFn ? resolvedCommand : resolvedCommand + ' ' + files.join(' ')

    debugLog(
      'Resolved an argument string length of %d characters from %d files',
      finalCommandString.length,
      files.length
    )

    return finalCommandString.length <= maxArgLength
  })

  if (fits) {
    return resolvedCommands.map((resolvedCommand) => ({
      command: resolvedCommand,
      files,
    }))
  }

  const middle = Math.ceil(files.length / 2)
  const left = files.slice(0, middle)
  const right = files.slice(middle)

  debugLog(
    'Splitting %d files into chunks of %d and %d for maxArgLength of %d',
    files.length,
    left.length,
    right.length,
    maxArgLength
  )

  const commands = await Promise.all([
    chunkFilesForCommand(command, left, maxArgLength),
    chunkFilesForCommand(command, right, maxArgLength),
  ])

  return commands.flat()
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

  const commandArray = Array.isArray(commands) ? commands : [commands]

  const filepaths = files.map((f) => f.filepath)

  if (filepaths.length === 0) {
    debugLog('Skipping task generation because no files matched', { commands })
    return []
  }

  const createTasks = async (command) => {
    const isFn = typeof command === 'function'
    const chunkedCommands = await chunkFilesForCommand(command, filepaths, maxArgLength)

    return chunkedCommands.map((chunk) => ({
      title: chunk.command,
      task: getSpawnedTask({
        abortController,
        command: chunk.command,
        continueOnError,
        cwd,
        files: chunk.files,
        topLevelDir,
        isFn,
        verbose,
      }),
    }))
  }

  const spawnedTasks = await Promise.all(
    commandArray.map(async (command) => {
      // Nested non-trivial array for running parallel tasks.
      if (Array.isArray(command) && command.length > 1) {
        const parallelTasks = await Promise.all(command.map(createTasks))
        return [parallelTasks.flat()]
      }

      return createTasks(command)
    })
  )

  return spawnedTasks.flat()
}
