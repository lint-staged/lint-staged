'use strict'

const { redBright, dim } = require('chalk')
const execa = require('execa')
const debug = require('debug')('lint-staged:task')
const { parseArgsStringToArgv } = require('string-argv')
const { error } = require('log-symbols')

const { getInitialState } = require('./state')
const { TaskError } = require('./symbols')

/**
 * Create a failure message dependding on process result.
 *
 * @param {string} linter
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
  const { code, killed, signal, stderr, stdout } = result

  const tag = signal || (killed && 'KILLED') || code || 'FAILED'

  const hasOutput = !!stderr || !!stdout
  if (hasOutput) {
    const errorTitle = redBright(`${error} ${command}:`)
    const output = ['', errorTitle].concat(stderr ? [stderr] : []).concat(stdout ? [stdout] : [])
    ctx.output.push(output.join('\n'))
  } else {
    // Show generic error when task had no output
    const message = redBright(`\n${error} ${command} failed without output (${tag}).`)
    ctx.output.push(message)
  }

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
 * @returns {function(): Promise<Array<string>>}
 */
module.exports = function resolveTaskFn({ command, files, gitDir, isFn, relative, shell = false }) {
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

  return async (ctx = getInitialState()) => {
    const result = await (shell
      ? execa.command(isFn ? command : `${command} ${files.join(' ')}`, execaOptions)
      : execa(cmd, isFn ? args : args.concat(files), execaOptions))

    if (result.failed || result.killed || result.signal != null) {
      throw makeErr(command, result, ctx)
    }
  }
}
