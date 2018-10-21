'use strict'

const dedent = require('dedent')
const execa = require('execa')
const symbols = require('log-symbols')
const findBin = require('./findBin')

const debug = require('debug')('lint-staged:task')

/**
 * Create and returns an error instance with given stdout and stderr. If we set
 * the message on the error instance, it gets logged multiple times(see #142).
 * So we set the actual error message in a private field and extract it later,
 * log only once.
 *
 * @param {string} linter
 * @param {string} errStdout
 * @param {string} errStderr
 * @returns {Error}
 */
function makeErr(linter, errStdout, errStderr) {
  const err = new Error()
  err.privateMsg = dedent`
    ${symbols.error} "${linter}" found some errors. Please fix them and try committing again.
    ${errStdout}
    ${errStderr}
  `
  return err
}

/**
 * Returns the task function for the linter. It handles chunking for file paths
 * if the OS is Windows.
 *
 * @param {Object} options
 * @param {string} options.linter
 * @param {string} options.gitDir
 * @param {Array<string>} options.pathsToLint
 * @param {number} options.maxPathsToLint
 * @returns {function(): Promise<string>}
 */
module.exports = function resolveTaskFn(options) {
  const { linter, gitDir, pathsToLint, maxPathsToLint } = options
  const { bin, args } = findBin(linter)

  const execaOptions = { reject: false }
  // Only use gitDir as CWD if we are using the git binary
  // e.g `npm` should run tasks in the actual CWD
  if (/git(\.exe)?$/i.test(bin) && gitDir !== process.cwd()) {
    execaOptions.cwd = gitDir
  }

  if (pathsToLint.length > maxPathsToLint) {
    return () =>
      Promise.reject(
        makeErr(
          linter,
          dedent`The file pattern specified for ${linter} matched ${pathsToLint.length} files.
            Attempting to run commands with too many arguments can result in cryptic
            errors on some platforms due to limitations on the total length of the command.
            Therefore, lint-staged will fail the task preemptively.

            It is recommended to run the linter on the entire project and commit the changes
            with --no-verify to bypass the pre-commit hook:

            \`git commit -m "Commit message" --no-verify\`

            Alternatively, the limit can be increased by specifying \`maxPathsToLint\`
            in the lint-staged config. See https://github.com/okonet/lint-staged#options.`,
          `Number of matched files exceeds limit(${maxPathsToLint}).`
        )
      )
  }

  return () => {
    // Execute the given linter binary with arguments and file paths using execa
    // and return the promise.
    const binArgs = args.concat(pathsToLint)

    debug('bin:', bin)
    debug('args: %O', binArgs)
    debug('opts: %o', execaOptions)

    return execa(bin, binArgs, execaOptions).then(result => {
      if (!result.failed) return `${symbols.success} ${linter} passed!`

      throw makeErr(linter, result.stdout, result.stderr)
    })
  }
}
