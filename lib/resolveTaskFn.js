'use strict'

const { redBright, dim } = require('chalk')
const { escape } = require('./escape')
const execa = require('execa')
const debug = require('debug')('lint-staged:task')
const { error, info } = require('log-symbols')
const { parseArgsStringToArgv } = require('string-argv')

const { getInitialState } = require('./state')
const { TaskError } = require('./symbols')

/**
 * Create command string that is executed in a shell using execa.
 * This is probably unsafe, and might even lead to command injection!
 * On Windows, use the same algorhitm as `execa`/`cross-spawn`.
 * On other platforms, wrap in single quotes to prevent subshells.
 *
 * @param {string} command the command
 * @param {Array<string>} files the matched files
 */
const getShellString = (command, files) => `${command} ${files.map(escape).join(' ')}`

const getTag = ({ code, killed, signal }) => signal || (killed && 'KILLED') || code || 'FAILED'

/**
 * Handle task console output.
 *
 * @param {string} command
 * @param {Object} result
 * @param {string} result.stdout
 * @param {string} result.stderr
 * @param {boolean} result.failed
 * @param {boolean} result.killed
 * @param {string} result.signal
 * @param {Object} ctx
 * @returns {Error}
 */
const handleOutput = (command, result, ctx, isError = false) => {
  const { stderr, stdout } = result
  const hasOutput = !!stderr || !!stdout

  if (hasOutput) {
    const outputTitle = isError ? redBright(`${error} ${command}:`) : `${info} ${command}:`
    const output = []
      .concat(ctx.quiet ? [] : ['', outputTitle])
      .concat(stderr ? stderr : [])
      .concat(stdout ? stdout : [])
    ctx.output.push(output.join('\n'))
  } else if (isError) {
    // Show generic error when task had no output
    const tag = getTag(result)
    const message = redBright(`\n${error} ${command} failed without output (${tag}).`)
    if (!ctx.quiet) ctx.output.push(message)
  }
}

/**
 * Create a error output dependding on process result.
 *
 * @param {string} command
 * @param {Object} result
 * @param {string} result.stdout
 * @param {string} result.stderr
 * @param {boolean} result.failed
 * @param {boolean} result.killed
 * @param {string} result.signal
 * @param {Object} ctx
 * @returns {Error}
 */
const makeErr = (command, result, ctx) => {
  ctx.errors.add(TaskError)
  handleOutput(command, result, ctx, true)
  const tag = getTag(result)
  return new Error(`${redBright(command)} ${dim(`[${tag}]`)}`)
}

/**
 * Returns the task function for the linter.
 *
 * @param {Object} options
 * @param {string} options.command — Linter task
 * @param {String} options.gitDir - Current git repo path
 * @param {Boolean} options.isFn - Whether the linter task is a function
 * @param {Array<string>} options.files — Filepaths to run the linter task against
 * @param {Boolean} [options.relative] — Whether the filepaths should be relative
 * @param {Boolean} [options.shell] — Whether to skip parsing linter task for better shell support
 * @param {Boolean} [options.verbose] — Always show task verbose
 * @returns {function(): Promise<Array<string>>}
 */
module.exports = function resolveTaskFn({
  command,
  files,
  gitDir,
  isFn,
  relative,
  shell = false,
  verbose = false,
}) {
  const [cmd, ...args] = parseArgsStringToArgv(command)
  debug('cmd:', cmd)
  debug('args:', args)

  const execaOptions = { preferLocal: true, reject: false, shell }
  if (relative) {
    execaOptions.cwd = process.cwd()
  } else if (/^git(\.exe)?/i.test(cmd) && gitDir !== process.cwd()) {
    // Only use gitDir as CWD if we are using the git binary
    // e.g `npm` should run tasks in the actual CWD
    execaOptions.cwd = gitDir
  }
  debug('execaOptions:', execaOptions)

  // Assign the final taskFn to be executed later
  let taskFn

  if (shell) {
    // if the command was a function, it's already evaluated and should include file names.
    // Otherwise, escape filenames for non-functional tasks to prevent issues
    const shellString = isFn ? command : getShellString(command, files)
    debug('Warning! Using the shell option with resolved command string:')
    debug('%s', shellString)
    taskFn = () => execa.command(shellString, execaOptions)
  } else {
    // execa and cross-spawn handle escaping of the arguments
    taskFn = () => execa(cmd, isFn ? args : args.concat(files), execaOptions)
  }

  return async (ctx = getInitialState()) => {
    const result = await taskFn()

    if (result.failed || result.killed || result.signal != null) {
      throw makeErr(command, result, ctx)
    }

    if (verbose) {
      handleOutput(command, result, ctx)
    }
  }
}
