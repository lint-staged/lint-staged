import chalk from 'chalk'
import debug from 'debug'
import spawn from 'nano-spawn'
import pidtree from 'pidtree'
import { parseArgsStringToArgv } from 'string-argv'

import { error, info } from './figures.js'
import { getInitialState } from './state.js'
import { TaskError } from './symbols.js'

const TASK_ERROR = 'lint-staged:taskError'

const debugLog = debug('lint-staged:getSpawnedTask')

/** @type {(error: import('nano-spawn').SubprocessError) => string} */
const getTag = (error) => {
  return error.signalName ?? 'FAILED'
}

/**
 * Handle task console output.
 *
 * @param {string} command
 * @param {import('nano-spawn').Result | import('nano-spawn').SubprocessError} result
 * @param {Object} ctx
 * @returns {Error}
 */
const handleOutput = (command, result, ctx, isError = false) => {
  if (result.output) {
    const outputTitle = isError ? chalk.redBright(`${error} ${command}:`) : `${info} ${command}:`
    const output = [...(ctx.quiet ? [] : ['', outputTitle]), result.output]
    ctx.output.push(output.join('\n'))
  } else if (isError) {
    // Show generic error when task had no output
    const tag = getTag(result)
    const message = chalk.redBright(`\n${error} ${command} failed without output (${tag}).`)
    if (!ctx.quiet) ctx.output.push(message)
  }
}

/**
 * Kill subprocess along with all its child processes.
 * @param {import('nano-spawn').Subprocess} subprocess
 */
const killSubprocess = async (subprocess) => {
  const childProcess = await subprocess.nodeChildProcess

  if (childProcess?.pid !== undefined) {
    try {
      for (const childPid of await pidtree(childProcess.pid)) {
        try {
          process.kill(childPid, 'SIGKILL')
        } catch (error) {
          debugLog(`Failed to kill process with pid "%d": %o`, childPid, error)
        }
      }
    } catch (error) {
      // Suppress "No matching pid found" error. This probably means
      // the process already died before executing.
      debugLog(`Failed to list child processes of pid "%d": %o`, childProcess.pid, error)
    }
  }

  // The child process is terminated separately in order to get the `KILLED` status.
  childProcess.kill('SIGKILL')
}

/**
 * Interrupts the execution of the subprocess that we spawned if
 * another task adds an error to the context.
 *
 * @param {Object} ctx
 * @param {import('nano-spawn').Subprocess} subprocess
 * @returns {() => Promise<void>} Function that clears the interval that
 * checks the context.
 */
const interruptExecutionOnError = (ctx, subprocess) => {
  let killPromise

  const errorListener = async () => {
    killPromise = killSubprocess(subprocess)
    await killPromise
  }

  ctx.events.on(TASK_ERROR, errorListener, { once: true })

  return async () => {
    ctx.events.off(TASK_ERROR, errorListener)
    if (killPromise) {
      await killPromise
    }
  }
}

/**
 * Create a error output depending on process result.
 *
 * @param {string} command
 * @param {import('nano-spawn').SubprocessError} error
 * @param {Object} ctx
 * @returns {Error}
 */
export const makeErr = (command, error, ctx) => {
  ctx.errors.add(TaskError)

  // https://nodejs.org/api/events.html#error-events
  ctx.events.emit(TASK_ERROR, TaskError)

  handleOutput(command, error, ctx, true)
  const tag = getTag(error)
  return new Error(`${chalk.redBright(command)} ${chalk.dim(`[${tag}]`)}`)
}

/**
 * Returns the task function for the linter.
 *
 * @param {Object} options
 * @param {string} options.command — Linter task
 * @param {string} [options.cwd]
 * @param {String} options.topLevelDir - Current git repo top-level path
 * @param {Boolean} options.isFn - Whether the linter task is a function
 * @param {string[]} options.files — Filepaths to run the linter task against
 * @param {Boolean} [options.verbose] — Always show task verbose
 * @returns {() => Promise<Array<string>>}
 */
export const getSpawnedTask = ({
  command,
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
  }

  debugLog('Spawn options:', spawnOptions)

  return async (ctx = getInitialState()) => {
    const subprocess = spawn(cmd, isFn ? args : args.concat(files), spawnOptions)

    const quitInterruptCheck = interruptExecutionOnError(ctx, subprocess)

    try {
      const result = await subprocess
      if (verbose) {
        handleOutput(command, result, ctx)
      }
    } catch (error) {
      throw makeErr(command, error, ctx)
    } finally {
      await quitInterruptCheck()
    }
  }
}
