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
const resolveGitRepo = require('./resolveGitRepo')

const debugLog = require('debug')('lint-staged:run')

const getRenderer = ({ debug, quiet }) => {
  if (quiet) return 'silent'
  // Better support for dumb terminals: https://en.wikipedia.org/wiki/Computer_terminal#Dumb_terminals
  const isDumbTerminal = process.env.TERM === 'dumb'
  if (debug || isDumbTerminal) return 'verbose'
  return 'update'
}

const MESSAGES = {
  TASK_ERROR: 'Skipped because of errors from tasks.',
  GIT_ERROR: 'Skipped because of previous git error.'
}

const shouldSkipApplyModifications = ctx => {
  // Should be skipped in case of git errors
  if (ctx.gitError) {
    return MESSAGES.GIT_ERROR
  }
  // Should be skipped when tasks fail
  if (ctx.taskError) {
    return MESSAGES.TASK_ERROR
  }
}

const shouldSkipRevert = ctx => {
  // Should be skipped in case of unknown git errors
  if (ctx.gitError && !ctx.gitApplyEmptyCommit && !ctx.gitApplyModificationsError) {
    return MESSAGES.GIT_ERROR
  }
}

const shouldSkipCleanup = ctx => {
  // Should be skipped in case of unknown git errors
  if (ctx.gitError && !ctx.gitApplyEmptyCommit && !ctx.gitApplyModificationsError) {
    return MESSAGES.GIT_ERROR
  }
  // Should be skipped when reverting to original state fails
  if (ctx.gitRestoreOriginalStateError) {
    return MESSAGES.GIT_ERROR
  }
}

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
const runAll = async (
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
) => {
  debugLog('Running all linter scripts')

  const { gitDir, gitConfigDir } = await resolveGitRepo(cwd)
  if (!gitDir) throw new Error('Current directory is not a git directory!')

  const files = await getStagedFiles({ cwd: gitDir })
  if (!files) throw new Error('Unable to get staged files!')
  debugLog('Loaded list of staged files in git:\n%O', files)

  // If there are no files avoid executing any lint-staged logic
  if (files.length === 0) {
    logger.log('No staged files found.')
    return 'No tasks to run.'
  }

  const stagedFileChunks = chunkFiles({ files, gitDir, maxArgLength, relative })
  const chunkCount = stagedFileChunks.length
  if (chunkCount > 1) debugLog(`Chunked staged files into ${chunkCount} part`, chunkCount)

  // lint-staged 10 will automatically add modifications to index
  // Warn user when their command includes `git add`
  let hasDeprecatedGitAdd = false

  const listrOptions = {
    dateFormat: false,
    exitOnError: false,
    renderer: getRenderer({ debug, quiet })
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

      if (subTasks.some(subTask => subTask.command === 'git add')) {
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
        if (ctx.gitError) return MESSAGES.GIT_ERROR
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

  const git = new GitWorkflow({ allowEmpty, gitConfigDir, gitDir, stagedFileChunks })

  const runner = new Listr(
    [
      {
        title: 'Preparing...',
        task: ctx => git.stashBackup(ctx)
      },
      ...listrTasks,
      {
        title: 'Applying modifications...',
        task: ctx => git.applyModifications(ctx),
        skip: shouldSkipApplyModifications
      },
      {
        title: 'Reverting to original state...',
        task: ctx => git.restoreOriginalState(ctx),
        enabled: ctx => ctx.taskError || ctx.gitApplyEmptyCommit || ctx.gitApplyModificationsError,
        skip: shouldSkipRevert
      },
      {
        title: 'Cleaning up...',
        task: ctx => git.dropBackup(ctx),
        skip: shouldSkipCleanup
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
    } else if (error.context.gitError && !error.context.gitGetBackupStashError) {
      logger.error(`\n  ${symbols.error} ${chalk.red(`lint-staged failed due to a git error.`)}`)

      if (error.context.emptyGitRepo) {
        logger.error(
          `\n    The initial commit is needed for lint-staged to work.
    Please use the --no-verify flag to skip running lint-staged.`
        )
      } else {
        // No sense to show this if the backup stash itself is missing.
        logger.error(`  Any lost modifications can be restored from a git stash:

    > git stash list
    stash@{0}: On master: automatic lint-staged backup
    > git stash pop stash@{0}\n`)
      }
    }

    throw error
  }
}

module.exports = runAll

module.exports.shouldSkip = {
  shouldSkipApplyModifications,
  shouldSkipRevert,
  shouldSkipCleanup
}
