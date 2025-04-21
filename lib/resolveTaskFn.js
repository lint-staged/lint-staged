import chalk from 'chalk'
import debug from 'debug'
import pidTree from 'pidtree'
import { parseArgsStringToArgv } from 'string-argv'

import { exec } from './exec.js'
import { error, info } from './figures.js'
import { getInitialState } from './state.js'
import { TaskError } from './symbols.js'

const TASK_ERROR = 'lint-staged:taskError'

const debugLog = debug('lint-staged:resolveTaskFn')

/** @typedef {import('./exec.js').ExecPromise} ExecPromise */

/**
 * @param {ExecPromise} execPromise
 */
const getTag = (execPromise) => {
  if (execPromise.process.signalCode) {
    return execPromise.process.signalCode
  }

  if (execPromise.process.killed) {
    return 'KILLED'
  }

  return 'FAILED'
}

/**
 * Handle task console output.
 *
 * @param {string} command
 * @param {ExecPromise} execPromise
 * @param {Object} ctx
 * @returns {Error}
 */
const handleOutput = (command, execPromise, ctx, isError = false) => {
  if (execPromise.output) {
    const outputTitle = isError ? chalk.redBright(`${error} ${command}:`) : `${info} ${command}:`
    const output = [].concat(ctx.quiet ? [] : ['', outputTitle]).concat(execPromise.output)
    ctx.output.push(output.join('\n'))
  } else if (isError) {
    // Show generic error when task had no output
    const tag = getTag(execPromise)
    const message = chalk.redBright(`\n${error} ${command} failed without output (${tag}).`)
    if (!ctx.quiet) ctx.output.push(message)
  }
}

/**
 * Kill an execa process along with all its child processes.
 * @param {ExecPromise} execPromise
 */
const killProcess = async (execPromise) => {
  try {
    const childPids = await pidTree(execPromise.process.pid)
    for (const childPid of childPids) {
      try {
        process.kill(childPid)
      } catch (error) {
        debugLog(`Failed to kill process with pid "%d": %o`, childPid, error)
      }
    }
  } catch (error) {
    // Suppress "No matching pid found" error. This probably means
    // the process already died before executing.
    debugLog(`Failed to kill process with pid "%d": %o`, execPromise.process.pid, error)
  }

  // The child process is killed separately in order to get the `KILLED` status.
  execPromise.process.kill()
}

/**
 * Interrupts the execution of the execa process that we spawned if
 * another task adds an error to the context.
 *
 * @param {Object} ctx
 * @param {ExecPromise} execPromise
 * @returns {() => Promise<void>} Function that clears the interval that
 * checks the context.
 */
const interruptExecutionOnError = (ctx, execPromise) => {
  let killPromise

  const errorListener = async () => {
    killPromise = killProcess(execPromise)
    await killPromise
  }

  ctx.events.on(TASK_ERROR, errorListener, { once: true })

  return async () => {
    ctx.events.off(TASK_ERROR, errorListener)
    await killPromise
  }
}

/**
 * Create a error output depending on process result.
 *
 * @param {string} command
 * @param {ExecPromise} errorResult
 * @param {Object} ctx
 * @returns {Error}
 */
const makeErr = (command, errorResult, ctx) => {
  ctx.errors.add(TaskError)

  // https://nodejs.org/api/events.html#error-events
  ctx.events.emit(TASK_ERROR, TaskError)

  handleOutput(command, errorResult, ctx, true)
  const tag = getTag(errorResult)
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
 * @param {Array<string>} options.files — Filepaths to run the linter task against
 * @param {Boolean} [options.verbose] — Always show task verbose
 * @returns {() => Promise<Array<string>>}
 */
export const resolveTaskFn = ({
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

  const execOptions = {
    // Only use topLevelDir as CWD if we are using the git binary
    // e.g `npm` should run tasks in the actual CWD
    cwd: /^git(\.exe)?/i.test(cmd) ? topLevelDir : cwd,
  }

  debugLog('exec options:', execOptions)

  return async (ctx = getInitialState()) => {
    const execPromise = exec(cmd, isFn ? args : args.concat(files), execOptions)
    const quitInterruptCheck = interruptExecutionOnError(ctx, execPromise)

    try {
      const result = await execPromise

      if (verbose) {
        handleOutput(command, result, ctx)
      }
    } catch (errorResult) {
      throw makeErr(command, errorResult, ctx)
    } finally {
      await quitInterruptCheck()
    }
  }
}
