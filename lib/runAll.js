'use strict'

/** @typedef {import('./index').Logger} Logger */

const { Listr } = require('listr2')

const chunkFiles = require('./chunkFiles')
const debugLog = require('debug')('lint-staged:run')
const generateTasks = require('./generateTasks')
const getRenderer = require('./getRenderer')
const createVcsAdapter = require('./createVcsAdapter')

const makeCmdTasks = require('./makeCmdTasks')
const { DEPRECATED_GIT_ADD, FAILED_GET_STAGED_FILES, NO_TASKS } = require('./messages')
const { getInitialState } = require('./state')
const { GetStagedFilesError } = require('./symbols')

const createError = (ctx) => Object.assign(new Error('lint-staged failed'), { ctx })

/**
 * Executes all tasks and either resolves or rejects the promise
 *
 * @param {object} options
 * @param {Object} [options.allowEmpty] - Allow empty commits when tasks revert all staged changes
 * @param {boolean | number} [options.concurrent] - The number of tasks to run concurrently, or false to run tasks serially
 * @param {Object} [options.config] - Task configuration
 * @param {Object} [options.cwd] - Current working directory
 * @param {boolean} [options.debug] - Enable debug mode
 * @param {number} [options.maxArgLength] - Maximum argument string length
 * @param {boolean} [options.quiet] - Disable lint-staged’s own console output
 * @param {boolean} [options.relative] - Pass relative filepaths to tasks
 * @param {boolean} [options.shell] - Skip parsing of tasks for better shell support
 * @param {boolean} [options.stash] - Enable the backup stash, and revert in case of errors
 * @param {boolean} [options.verbose] - Show task output even when tasks succeed; by default only failed output is shown
 * @param {Logger} logger
 * @returns {Promise}
 */
const runAll = async (
  {
    allowEmpty = false,
    concurrent = true,
    config,
    cwd = process.cwd(),
    debug = false,
    maxArgLength,
    quiet = false,
    relative = false,
    shell = false,
    stash = true,
    verbose = false,
    vcsAdapter = undefined,
  },
  logger = console
) => {
  debugLog('Running all linter scripts')

  const ctx = getInitialState({ quiet })

  const adapter = createVcsAdapter(vcsAdapter, { allowEmpty, stash, cwd, ctx, logger })

  const { baseDir, files: stagedFiles } = await adapter.init()

  debugLog('Loaded list of staged files in git:\n%O', stagedFiles)

  // If there are no files avoid executing any lint-staged logic
  if (!stagedFiles) {
    if (!quiet) ctx.output.push(FAILED_GET_STAGED_FILES)
    ctx.errors.add(GetStagedFilesError)
    throw createError(ctx)
  }

  const stagedFileChunks = chunkFiles({ baseDir, files: stagedFiles, maxArgLength, relative })
  const chunkCount = stagedFileChunks.length
  if (chunkCount > 1) debugLog(`Chunked staged files into ${chunkCount} part`, chunkCount)

  // lint-staged 10 will automatically add modifications to index
  // Warn user when their command includes `git add`
  let hasDeprecatedGitAdd = false

  const listrOptions = {
    ctx,
    exitOnError: false,
    nonTTYRenderer: 'verbose',
    ...getRenderer({ debug, quiet }),
  }

  const listrTasks = []

  // Set of all staged files that matched a task glob. Values in a set are unique.
  const matchedFiles = new Set()

  for (const [index, files] of stagedFileChunks.entries()) {
    const chunkTasks = generateTasks({ config, cwd, baseDir, files, relative })
    const chunkListrTasks = []

    for (const task of chunkTasks) {
      const subTasks = await makeCmdTasks({
        commands: task.commands,
        files: task.fileList,
        baseDir,
        renderer: listrOptions.renderer,
        shell,
        verbose,
      })

      // Add files from task to match set
      task.fileList.forEach((file) => {
        matchedFiles.add(file)
      })

      hasDeprecatedGitAdd = subTasks.some((subTask) => subTask.command === 'git add')

      chunkListrTasks.push({
        title: `Running tasks for ${task.pattern}`,
        task: async () =>
          new Listr(subTasks, {
            // In sub-tasks we don't want to run concurrently
            // and we want to abort on errors
            ...listrOptions,
            concurrent: false,
            exitOnError: true,
          }),
        skip: () => {
          // Skip task when no files matched
          if (task.fileList.length === 0) {
            return `No staged files match ${task.pattern}`
          }
          return false
        },
      })
    }

    listrTasks.push({
      // No need to show number of task chunks when there's only one
      title:
        chunkCount > 1 ? `Running tasks (chunk ${index + 1}/${chunkCount})...` : 'Running tasks...',
      task: () => new Listr(chunkListrTasks, { ...listrOptions, concurrent }),
      skip: () => {
        // Skip chunk when no every task is skipped (due to no matches)
        if (chunkListrTasks.every((task) => task.skip())) return 'No tasks to run.'
        return adapter.executeTasksSkipped() || false
      },
    })
  }

  if (hasDeprecatedGitAdd) {
    logger.warn(DEPRECATED_GIT_ADD)
  }

  // If all of the configured tasks should be skipped
  // avoid executing any lint-staged logic
  if (listrTasks.every((task) => task.skip())) {
    if (!quiet) ctx.output.push(NO_TASKS)
    return ctx
  }

  // Chunk matched files for better Windows compatibility
  ctx.matchedFileChunks = chunkFiles({
    // matched files are relative to `cwd`, not `baseDir`, when `relative` is used
    baseDir: cwd,
    files: Array.from(matchedFiles),
    maxArgLength,
    relative: false,
  })

  const beforeAllTasks = await adapter.beforeAll()
  const afterAllTasks = await adapter.afterAll()

  const runner = new Listr([...beforeAllTasks, ...listrTasks, ...afterAllTasks], listrOptions)

  await runner.run()

  await adapter.finalize()

  if (ctx.errors.size > 0) {
    throw createError(ctx)
  }

  return ctx
}

module.exports = runAll
