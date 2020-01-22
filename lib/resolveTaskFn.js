'use strict'

const chalk = require('chalk')
const { parseArgsStringToArgv } = require('string-argv')
const dedent = require('dedent')
const execa = require('execa')
const symbols = require('log-symbols')

const debug = require('debug')('lint-staged:task')

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
  context.taskError = true
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

  return async ctx => {
    const promise = shell
      ? execa.command(isFn ? command : `${command} ${files.join(' ')}`, execaOptions)
      : execa(cmd, isFn ? args : args.concat(files), execaOptions)
    const result = await promise

    if (result.failed || result.killed || result.signal != null) {
      throw makeErr(cmd, result, ctx)
    }

    return successMsg(cmd)
  }
}
