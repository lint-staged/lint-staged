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
 * @param {Object} [options.config] - Task configuration
 * @param {Object} [options.cwd] - Current working directory
 * @param {number} [options.maxArgLength] - Maximum argument string length
 * @param {boolean} [options.relative] - Pass relative filepaths to tasks
 * @param {boolean} [options.shell] - Skip parsing of tasks for better shell support
 * @param {boolean} [options.quiet] - Disable lint-staged’s own console output
 * @param {boolean} [options.debug] - Enable debug mode
 * @param {Logger} logger
 * @returns {Promise}
 */
module.exports = async function runAll(
  {
    config,
    cwd = process.cwd(),
    debug = false,
    maxArgLength,
    quiet = false,
    relative = false,
    shell = false
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

  const chunkedFiles = chunkFiles({ files, gitDir, maxArgLength, relative })
  debugLog('Chunked staged files into %s parts', chunkedFiles.length)

  // lint-staged 10 will automatically add modifications to index
  // Warn user when their command includes `git add`
  let hasDeprecatedGitAdd = false

  const listrOptions = {
    dateFormat: false,
    renderer: (quiet && 'silent') || (debug && 'verbose') || 'update'
  }

  const listrTasks = []

  for (const [index, files] of chunkedFiles.entries()) {
    const chunkTasks = generateTasks({ config, cwd, gitDir, files, relative })
    const chunkListrTasks = chunkTasks.map(task => {
      const subTasks = makeCmdTasks({
        commands: task.commands,
        files: task.fileList,
        gitDir,
        shell
      })

      if (subTasks.some(subTask => subTask.command.includes('git add'))) {
        hasDeprecatedGitAdd = true
      }

      return {
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
          if (task.fileList.length === 0) {
            return `No staged files match ${task.pattern}`
          }
          return false
        }
      }
    })

    listrTasks.push({
      title: `Running tasks (${index}/${chunkedFiles.length})...`,
      task: () =>
        new Listr(chunkListrTasks, { ...listrOptions, concurrent: false, exitOnError: false }),
      skip: () => {
        if (chunkListrTasks.every(task => task.skip())) {
          return 'No tasks to run'
        }
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

  const git = new GitWorkflow(gitDir)

  const runner = new Listr(
    [
      {
        title: 'Preparing...',
        task: () => git.stashBackup()
      },
      ...(listrTasks.length === 1
        ? [
            {
              ...listrTasks[0],
              title: 'Running tasks...'
            }
          ]
        : listrTasks),
      {
        title: 'Applying modifications...',
        skip: ctx => ctx.hasErrors && 'Skipped because of errors from tasks',
        task: () => git.applyModifications()
      },
      {
        title: 'Reverting to original state...',
        enabled: ctx => ctx.hasErrors,
        task: () => git.restoreOriginalState()
      },
      {
        title: 'Cleaning up...',
        task: () => git.dropBackup()
      }
    ],
    listrOptions
  )

  try {
    await runner.run()
  } catch (error) {
    if (error.message.includes('Another git process seems to be running in this repository')) {
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
