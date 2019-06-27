'use strict'

const chalk = require('chalk')
const dedent = require('dedent')
const execa = require('execa')
const symbols = require('log-symbols')

const findBin = require('./findBin')

const debug = require('debug')('lint-staged:task')

/**
 * Execute the given linter binary with arguments using execa and
 * return the promise.
 *
 * @param {string} bin
 * @param {Array<string>} args
 * @param {Object} execaOptions
 * @return {Promise} child_process
 */
function execLinter(bin, args, execaOptions) {
  debug('bin:', bin)
  debug('args: %O', args)
  debug('opts: %o', execaOptions)

  return execa(bin, args, { ...execaOptions })
}

/**
 * https://serverfault.com/questions/69430/what-is-the-maximum-length-of-a-command-line-in-mac-os-x
 * https://support.microsoft.com/en-us/help/830473/command-prompt-cmd-exe-command-line-string-limitation
 * https://unix.stackexchange.com/a/120652
 */
const MAX_ARG_LENGTH =
  (process.platform === 'darwin' && 262144) || (process.platform === 'win32' && 8191) || 131072

const successMsg = linter => `${symbols.success} ${linter} passed!`

/**
 * Create and returns an error instance with a given message.
 * If we set the message on the error instance, it gets logged multiple times(see #142).
 * So we set the actual error message in a private field and extract it later,
 * log only once.
 *
 * @param {string} message
 * @returns {Error}
 */
function throwError(message) {
  const err = new Error()
  err.privateMsg = `\n\n\n${message}`
  return err
}

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
 * @param {Object} context (see https://github.com/SamVerschueren/listr#context)
 * @returns {Error}
 */
function makeErr(linter, result, context = {}) {
  // Indicate that some linter will fail so we don't update the index with formatting changes
  context.hasErrors = true // eslint-disable-line no-param-reassign
  const { stdout, stderr, killed, signal } = result
  if (killed || (signal && signal !== '')) {
    return throwError(
      `${symbols.warning} ${chalk.yellow(`${linter} was terminated with ${signal}`)}`
    )
  }
  return throwError(dedent`${symbols.error} ${chalk.redBright(
    `${linter} found some errors. Please fix them and try committing again.`
  )}
  ${stdout}
  ${stderr}
  `)
}

/**
 * Returns the task function for the linter. It handles chunking for file paths
 * if the OS is Windows.
 *
 * @param {Object} options
 * @param {string} options.linter
 * @param {string} options.gitDir
 * @param {Array<string>} options.pathsToLint
 * @returns {function(): Promise<Array<string>>}
 */
module.exports = function resolveTaskFn(options) {
  const { linter, gitDir, pathsToLint } = options

  // If `linter` is a function, it should return a string when evaluated with `pathsToLint`.
  // Else, it's a already a string
  const fnLinter = typeof linter === 'function'
  const linterString = fnLinter ? linter(pathsToLint) : linter
  // Support arrays of strings/functions by treating everything as arrays
  const linters = Array.isArray(linterString) ? linterString : [linterString]

  const tasks = linters.map(command => {
    const { bin, args } = findBin(command)

    const argLength = args.join(' ').length
    if (argLength > MAX_ARG_LENGTH) {
      console.warn(dedent`${symbols.warning}  ${chalk.yellow(
        `${chalk.bold(
          command
        )} received an argument string of ${argLength} characters, and might not run correctly on your platform.
It is recommended to use functions as linters and split your command based on the number of staged files. For more info, please read:
https://github.com/okonet/lint-staged#using-js-functions-to-customize-linter-commands
        `
      )}
        `)
    }

    // If `linter` is a function, args already include `pathsToLint`.
    const argsWithPaths = fnLinter ? args : args.concat(pathsToLint)

    const execaOptions = { reject: false }
    // Only use gitDir as CWD if we are using the git binary
    // e.g `npm` should run tasks in the actual CWD
    if (/git(\.exe)?$/i.test(bin) && gitDir !== process.cwd()) {
      execaOptions.cwd = gitDir
    }

    return ctx =>
      execLinter(bin, argsWithPaths, execaOptions).then(result => {
        if (result.failed || result.killed || result.signal != null) {
          throw makeErr(linter, result, ctx)
        }

        return successMsg(linter)
      })
  })

  return ctx => Promise.all(tasks.map(task => task(ctx)))
}
