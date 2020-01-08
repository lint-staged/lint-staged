'use strict'

/** @typedef {import('./index').Logger} Logger */

const chalk = require('chalk')
const Listr = require('listr')
const symbols = require('log-symbols')

const chunkFiles = require('./chunkFiles')
const generateTasks = require('./generateTasks')
const getStagedFiles = require('./getStagedFiles')
const GitWorkflow = require('./gitWorkflow')
const makeCmdTasks = require('./makeCmdTasks')
const resolveGitDir = require('./resolveGitDir')

const debugLog = require('debug')('lint-staged:run')

/**
 * Executes all tasks and either resolves or rejects the promise
 *
 * @param {object} options
 * @param {Object} [options.allowEmpty] - Allow empty commits when tasks revert all staged changes
 * @param {Object} [options.config] - Task configuration
 * @param {Object} [options.cwd] - Current working directory
 * @param {number} [options.maxArgLength] - Maximum argument string length
 * @param {boolean} [options.relative] - Pass relative filepaths to tasks
 * @param {boolean} [options.shell] - Skip parsing of tasks for better shell support
 * @param {boolean} [options.quiet] - Disable lint-staged’s own console output
 * @param {boolean} [options.debug] - Enable debug mode
 * @param {boolean | number} [options.concurrent] - The number of tasks to run concurrently, or false to run tasks serially
 * @param {Logger} logger
 * @returns {Promise}
 */
module.exports = async function runAll(
  {
    allowEmpty = false,
    config,
    cwd = process.cwd(),
    debug = false,
    maxArgLength,
    quiet = false,
    relative = false,
    shell = false,
    concurrent = true
  },
  logger = console
) {
  debugLog('Running all linter scripts')

  const gitDir = await resolveGitDir({ cwd })

  if (!gitDir) {
    throw new Error('Current directory is not a git directory!')
  }

  debugLog('Resolved git directory to be `%s`', gitDir)

  const files = await getStagedFiles({ cwd: gitDir })

  if (!files) {
    throw new Error('Unable to get staged files!')
  }

  debugLog('Loaded list of staged files in git:\n%O', files)

  const stagedFileChunks = chunkFiles({ files, gitDir, maxArgLength, relative })
  const chunkCount = stagedFileChunks.length
  if (chunkCount > 1) {
    debugLog(`Chunked staged files into ${chunkCount} part`, chunkCount)
  }

  // lint-staged 10 will automatically add modifications to index
  // Warn user when their command includes `git add`
  let hasDeprecatedGitAdd = false

  const listrOptions = {
    dateFormat: false,
    exitOnError: false,
    renderer: (quiet && 'silent') || (debug && 'verbose') || 'update'
  }

  const listrTasks = []

  for (const [index, files] of stagedFileChunks.entries()) {
    const chunkTasks = generateTasks({ config, cwd, gitDir, files, relative })
    const chunkListrTasks = []

    for (const task of chunkTasks) {
      const subTasks = await makeCmdTasks({
        commands: task.commands,
        files: task.fileList,
        gitDir,
        shell
      })

      if (subTasks.some(subTask => subTask.command.includes('git add'))) {
        hasDeprecatedGitAdd = true
      }

      chunkListrTasks.push({
        title: `Running tasks for ${task.pattern}`,
        task: async () =>
          new Listr(subTasks, {
            // In sub-tasks we don't want to run concurrently
            // and we want to abort on errors
            dateFormat: false,
            concurrent: false,
            exitOnError: true
          }),
        skip: () => {
          // Skip task when no files matched
          if (task.fileList.length === 0) {
            return `No staged files match ${task.pattern}`
          }
          return false
        }
      })
    }

    listrTasks.push({
      // No need to show number of task chunks when there's only one
      title:
        chunkCount > 1 ? `Running tasks (chunk ${index + 1}/${chunkCount})...` : 'Running tasks...',
      task: () => new Listr(chunkListrTasks, { ...listrOptions, concurrent }),
      skip: (ctx = {}) => {
        // Skip if the first step (backup) failed
        if (ctx.gitError) return 'Skipped because of previous git error.'
        // Skip chunk when no every task is skipped (due to no matches)
        if (chunkListrTasks.every(task => task.skip())) return 'No tasks to run.'
        return false
      }
    })
  }

  if (hasDeprecatedGitAdd) {
    logger.warn(`${symbols.warning} ${chalk.yellow(
      `Some of your tasks use \`git add\` command. Please remove it from the config since all modifications made by tasks will be automatically added to the git commit index.`
    )}
`)
  }

  // If all of the configured tasks should be skipped
  // avoid executing any lint-staged logic
  if (listrTasks.every(task => task.skip())) {
    logger.log('No staged files match any of provided globs.')
    return 'No tasks to run.'
  }

  const git = new GitWorkflow({ allowEmpty, gitDir, stagedFileChunks })

  // Running git reset or dropping the backup stash should be skipped
  // when there are git errors NOT related to applying unstaged modifications.
  // In the latter case, the original state is restored.
  const cleanupNotSafe = ctx =>
    ctx.gitError &&
    !ctx.gitApplyEmptyCommit &&
    !ctx.gitApplyModificationsError &&
    'Skipped because of previous git error.'

  const runner = new Listr(
    [
      {
        title: 'Preparing...',
        task: ctx => git.stashBackup(ctx)
      },
      ...listrTasks,
      {
        title: 'Applying modifications...',
        skip: ctx => {
          if (ctx.gitError) return 'Skipped because of previous git error.'
          if (ctx.taskError) return 'Skipped because of errors from tasks.'
        },
        task: ctx => git.applyModifications(ctx)
      },
      {
        title: 'Reverting to original state...',
        enabled: ctx => ctx.taskError || ctx.gitApplyEmptyCommit || ctx.gitApplyModificationsError,
        skip: cleanupNotSafe,
        task: ctx => git.restoreOriginalState(ctx)
      },
      {
        title: 'Cleaning up...',
        skip: cleanupNotSafe,
        task: ctx => git.dropBackup(ctx)
      }
    ],
    listrOptions
  )

  try {
    await runner.run({})
  } catch (error) {
    if (error.context.gitApplyEmptyCommit) {
      logger.warn(`
  ${symbols.warning} ${chalk.yellow(`lint-staged prevented an empty git commit.
    Use the --allow-empty option to continue, or check your task configuration`)}
`)
    }

    // Show help text about manual restore in case of git errors.
    // No sense to show this if the backup stash itself is missing.
    else if (error.context.gitError && !error.context.gitGetBackupStashError) {
      logger.error(`
  ${symbols.error} ${chalk.red(`lint-staged failed due to a git error.
    Any lost modifications can be restored from a git stash:

    > git stash list
    stash@{0}: On master: automatic lint-staged backup
    > git stash pop stash@{0}`)}
`)
    }

    throw error
  }
}
