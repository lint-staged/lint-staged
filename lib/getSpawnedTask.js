import spawn, { SubprocessError } from 'nano-spawn'
import { parseArgsStringToArgv } from 'string-argv'

import { blackBright, red } from './colors.js'
import { createDebug } from './debug.js'
import { error, info } from './figures.js'
import { killSubProcesses } from './killSubprocesses.js'
import { getInitialState } from './state.js'
import { TaskError } from './symbols.js'

const debugLog = createDebug('lint-staged:getSpawnedTask')

/**
 * @param {import('nano-spawn').SubprocessError} error
 * @param {boolean} [killed]
 * @returns {string}
 */
const getTag = (error, killed) => {
  return killed ? 'SIGKILL' : (error.signalName ?? 'FAILED')
}

/**
 * Handle task console output.
 *
 * @param {string} command
 * @param {import('nano-spawn').Result | import('nano-spawn').SubprocessError} result
 * @param {ReturnType<typeof getInitialState>} ctx context
 * @param {boolean} [isError]
 * @param {boolean} [killed]
 */
const handleTaskOutput = (command, result, ctx, isError, killed) => {
  if (result.output) {
    const outputTitle = isError ? red(`${error} ${command}:`) : `${info} ${command}:`
    const output = [...(ctx.quiet ? [] : ['', outputTitle]), result.output]
    ctx.output.push(output.join('\n'))
    return
  }

  if (ctx.quiet) {
    return
  }

  if (killed) {
    ctx.output.push(red(`\n${error} Task terminated: ${command}`))
  } else if (result instanceof SubprocessError) {
    ctx.output.push(
      red(`\n${error} Task failed to spawn: ${command}`),
      result.message,
      result.cause
    )
  } else if (isError) {
    // Show generic error when task had no output
    const tag = getTag(result, killed)
    const message = red(`\n${error} Task failed without output (${tag}): ${command}`)
    ctx.output.push(message)
  }
}

/**
 * Create a error output depending on process result.
 *
 * @param {string} command
 * @param {import('nano-spawn').SubprocessError} error
 * @param {ReturnType<typeof getInitialState>} ctx context
 * @param {boolean} [killed]
 * @returns {Error}
 */
export const createTaskError = (command, error, ctx, killed) => {
  ctx.errors.add(TaskError)

  handleTaskOutput(command, error, ctx, true, killed)

  const tag = getTag(error, killed)
  return new Error(`${red(command)} ${blackBright(`[${tag}]`)}`, { cause: error })
}

/**
 * Returns the task function for the linter.
 *
 * @param {Object} options
 * @param {AbortController} options.abortController
 * @param {boolean} [options.color]
 * @param {string} options.command — Linter task
 * @param {string} [options.continueOnError]
 * @param {string} [options.cwd]
 * @param {String} options.topLevelDir - Current git repo top-level path
 * @param {Boolean} options.isFn - Whether the linter task is a function
 * @param {string[]} options.files — Filepaths to run the linter task against
 * @param {Boolean} [options.verbose] — Always show task verbose
 * @returns {() => Promise<Array<string>>}
 */
export const getSpawnedTask = ({
  abortController,
  color,
  command,
  continueOnError = false,
  cwd = process.cwd(),
  files,
  topLevelDir,
  isFn,
  verbose = false,
}) => {
  const [cmd, ...args] = parseArgsStringToArgv(command)
  debugLog('cmd:', cmd)
  debugLog('args:', args)

  const spawnOptions = {
    // Only use topLevelDir as CWD if we are using the git binary
    // e.g `npm` should run tasks in the actual CWD
    cwd: /^git(\.exe)?/i.test(cmd) ? topLevelDir : cwd,
    preferLocal: true,
    stdin: 'ignore',
    env: color ? { FORCE_COLOR: 'true' } : { NO_COLOR: 'true' },
    detached: true,
  }

  debugLog('Spawn options:', spawnOptions)

  /** @param {ReturnType<typeof getInitialState>} ctx context */
  return async (ctx = getInitialState()) => {
    let killed = false

    try {
      /** spawn configured task */
      const subprocess = spawn(cmd, isFn ? args : args.concat(files), spawnOptions)

      abortController.signal.addEventListener(
        'abort',
        async () => {
          const childProcess = await subprocess.nodeChildProcess.catch(() => null)
          if (!childProcess) return /** cannot kill if process missing */

          if (abortController.signal.reason === 'SIGINT') {
            childProcess.kill('SIGINT')
          } else if (continueOnError !== true) {
            /** Try to kill any sub-processes on failure, instead of just leaving them hanging */
            try {
              killed = true
              const childProcess = await subprocess.nodeChildProcess
              await killSubProcesses(childProcess)
              childProcess.kill('SIGKILL')
            } catch {
              /** ignore internal nano-spawn errors, if child process isn't available it can't be killed */
            }
          }
        },
        { once: true }
      )

      const result = await subprocess
      if (verbose) {
        handleTaskOutput(command, result, ctx, killed)
      }
    } catch (error) {
      abortController.abort('FAILURE')
      throw createTaskError(command, error, ctx, killed)
    }
  }
}
