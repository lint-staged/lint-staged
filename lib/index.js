import debug from 'debug'

import { PREVENTED_EMPTY_COMMIT, GIT_ERROR, RESTORE_STASH_EXAMPLE } from './messages.js'
import { printTaskOutput } from './printTaskOutput.js'
import { runAll } from './runAll.js'
import { ApplyEmptyCommitError, GetBackupStashError, GitError } from './symbols.js'
import { validateOptions } from './validateOptions.js'

const debugLog = debug('lint-staged')

/**
 * @typedef {(...any) => void} LogFunction
 * @typedef {{ error: LogFunction, log: LogFunction, warn: LogFunction }} Logger
 *
 * Root lint-staged function that is called from `bin/lint-staged`.
 *
 * @param {object} options
 * @param {Object} [options.allowEmpty] - Allow empty commits when tasks revert all staged changes
 * @param {boolean | number} [options.concurrent] - The number of tasks to run concurrently, or false to run tasks serially
 * @param {object}  [options.config] - Object with configuration for programmatic API
 * @param {string} [options.configPath] - Path to configuration file
 * @param {Object} [options.cwd] - Current working directory
 * @param {boolean} [options.debug] - Enable debug mode
 * @param {number} [options.maxArgLength] - Maximum argument string length
 * @param {boolean} [options.quiet] - Disable lint-staged’s own console output
 * @param {boolean} [options.relative] - Pass relative filepaths to tasks
 * @param {boolean|string} [options.shell] - Skip parsing of tasks for better shell support
 * @param {boolean} [options.stash] - Enable the backup stash, and revert in case of errors
 * @param {boolean} [options.verbose] - Show task output even when tasks succeed; by default only failed output is shown
 * @param {Logger} [logger]
 *
 * @returns {Promise<boolean>} Promise of whether the linting passed or failed
 */
const lintStaged = async (
  {
    allowEmpty = false,
    concurrent = true,
    config: configObject,
    configPath,
    cwd,
    debug = false,
    maxArgLength,
    quiet = false,
    relative = false,
    shell = false,
    stash = true,
    verbose = false,
  } = {},
  logger = console
) => {
  await validateOptions({ cwd, shell }, logger)

  // Unset GIT_LITERAL_PATHSPECS to not mess with path interpretation
  debugLog('Unset GIT_LITERAL_PATHSPECS (was `%s`)', process.env.GIT_LITERAL_PATHSPECS)
  delete process.env.GIT_LITERAL_PATHSPECS

  try {
    const ctx = await runAll(
      {
        allowEmpty,
        concurrent,
        configObject,
        configPath,
        cwd,
        debug,
        maxArgLength,
        quiet,
        relative,
        shell,
        stash,
        verbose,
      },
      logger
    )
    debugLog('Tasks were executed successfully!')
    printTaskOutput(ctx, logger)
    return true
  } catch (runAllError) {
    if (runAllError && runAllError.ctx && runAllError.ctx.errors) {
      const { ctx } = runAllError
      if (ctx.errors.has(ApplyEmptyCommitError)) {
        logger.warn(PREVENTED_EMPTY_COMMIT)
      } else if (ctx.errors.has(GitError) && !ctx.errors.has(GetBackupStashError)) {
        logger.error(GIT_ERROR)
        if (ctx.shouldBackup) {
          // No sense to show this if the backup stash itself is missing.
          logger.error(RESTORE_STASH_EXAMPLE)
        }
      }

      printTaskOutput(ctx, logger)
      return false
    }

    // Probably a compilation error in the config js file. Pass it up to the outer error handler for logging.
    throw runAllError
  }
}

export default lintStaged
