import { assertGitVersion, MIN_GIT_VERSION } from './assertGitVersion.js'
import { enableColors } from './colors.js'
import { createDebug, enableDebug } from './debug.js'
import { execGit } from './execGit.js'
import {
  gitError,
  minGitVersionRequired,
  noConfiguration,
  preventedEmptyCommit,
  preventedTaskModifications,
  restoreStashExample,
  unstagedChangesBackupStashLocation,
} from './messages.js'
import { parseOptions } from './parseOptions.js'
import { printTaskOutput } from './printTaskOutput.js'
import { runAll } from './runAll.js'
import { cleanupSkipped } from './state.js'
import {
  ApplyEmptyCommitError,
  ConfigNotFoundError,
  FailOnChangesError,
  GitError,
  RestoreUnstagedChangesError,
} from './symbols.js'
import { validateOptions } from './validateOptions.js'
import { getVersion } from './version.js'

const debugLog = createDebug('lint-staged')

/**
 * @typedef {(...any) => void} LogFunction
 * @typedef {{ error: LogFunction, log: LogFunction, warn: LogFunction }} Logger
 *
 * Root lint-staged function that is called from `bin/lint-staged`.
 *
 * @param {object} options
 * @param {Object} [options.all] - include all files tracked in Git instead of only staged
 * @param {Object} [options.allowEmpty] - Allow empty commits when tasks revert all staged changes
 * @param {boolean} [options.color] - Enable or disable ANSI color codes in output.
 * @param {boolean | number} [options.concurrent] - The number of tasks to run concurrently, or false to run tasks serially
 * @param {object}  [options.config] - Object with configuration for programmatic API
 * @param {string} [options.configPath] - Path to configuration file
 * @param {boolean} [options.continueOnError] - Run all tasks to completion even if one fails
 * @param {Object} [options.cwd] - Current working directory
 * @param {boolean} [options.debug] - Enable debug mode
 * @param {string} [options.diff] - Override the default "--staged" flag of "git diff" to get list of files
 * @param {string} [options.diffFilter] - Override the default "--diff-filter=ACMR" flag of "git diff" to get list of files
 * @param {boolean} [options.failOnChanges] - Fail with exit code 1 when tasks modify tracked files
 * @param {boolean} [options.hidePartiallyStaged] - Whether to hide unstaged changes from partially staged files before running tasks
 * @param {boolean} [options.hideUnstaged] - Whether to hide all unstaged changes before running tasks
 * @param {number} [options.maxArgLength] - Maximum argument string length
 * @param {boolean} [options.quiet] - Disable lint-staged’s own console output
 * @param {boolean} [options.relative] - Pass relative filepaths to tasks
 * @param {boolean} [options.revert] - revert to original state in case of errors
 * @param {boolean} [options.stash] - Enable the backup stash, and revert in case of errors
 * @param {boolean} [options.verbose] - Show task output even when tasks succeed; by default only failed output is shown
 * @param {Logger} [logger]
 *
 * @returns {Promise<boolean>} Promise of whether the task passed or failed
 */
const lintStaged = async (options = {}, logger = console) => {
  const parsedOptions = parseOptions(options)

  enableColors(parsedOptions.color)

  // Seemingly enable debug twice (also done in bin), so that it also works when using the Node.js API
  if (parsedOptions.debug) {
    enableDebug(logger)

    debugLog(
      'Running `lint-staged@%s` on Node.js %s (%s)',
      await getVersion(),
      process.version,
      process.platform
    )
  }

  const gitVersion = await execGit(['version', '--build-options'], { cwd: parsedOptions.cwd })
  debugLog('%s', gitVersion)

  if (!assertGitVersion(gitVersion)) {
    throw new Error(minGitVersionRequired(MIN_GIT_VERSION, gitVersion), { cause: gitVersion })
  }

  await validateOptions(parsedOptions, logger)

  // Unset GIT_LITERAL_PATHSPECS to not mess with path interpretation
  debugLog('Unset GIT_LITERAL_PATHSPECS (was `%s`)', process.env.GIT_LITERAL_PATHSPECS)
  delete process.env.GIT_LITERAL_PATHSPECS

  try {
    const ctx = await runAll(parsedOptions, logger)
    debugLog('Tasks were executed successfully!')
    printTaskOutput(ctx, logger)
    return true
  } catch (runAllError) {
    if (runAllError?.ctx?.errors) {
      const { ctx } = runAllError

      if (ctx.errors.has(ConfigNotFoundError)) {
        logger.error(noConfiguration())
      } else if (ctx.errors.has(ApplyEmptyCommitError)) {
        logger.warn(preventedEmptyCommit())
      } else if (ctx.errors.has(FailOnChangesError)) {
        logger.warn(preventedTaskModifications() + '\n')
        logger.warn(restoreStashExample(ctx.backupHash))
      } else if (ctx.errors.has(RestoreUnstagedChangesError)) {
        logger.warn(unstagedChangesBackupStashLocation())
        logger.warn(ctx.unstagedPatch)
      } else if (ctx.errors.has(GitError) || cleanupSkipped(ctx)) {
        logger.error(gitError())
        if (ctx.shouldBackup) {
          // No sense to show this if the backup stash itself is missing.
          logger.error(restoreStashExample(ctx.backupHash) + '\n')
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
