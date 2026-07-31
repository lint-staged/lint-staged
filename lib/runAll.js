/** @typedef {import('./index').Logger} Logger */

import path from 'node:path'

import { dim } from './colors.js'
import { createDebug } from './debug.js'
import { execGit } from './execGit.js'
import * as figures from './figures.js'
import { generateTasks } from './generateTasks.js'
import { getAbortController } from './getAbortController.js'
import { getFunctionTask, isFunctionTask } from './getFunctionTask.js'
import { getSpawnedTasks } from './getSpawnedTasks.js'
import { getStagedFiles } from './getStagedFiles.js'
import { GitWorkflow } from './gitWorkflow.js'
import { groupFilesByConfig } from './groupFilesByConfig.js'
import {
  deprecatedGitAdd,
  failedGetStagedFiles,
  noStagedFiles,
  noTasks,
  notGitRepo,
  skippingBackup,
  skippingHidePartiallyChanged,
} from './messages.js'
import { normalizePath } from './normalizePath.js'
import { resolveGitRepo } from './resolveGitRepo.js'
import { searchConfigs } from './searchConfigs.js'
import {
  cleanupEnabled,
  cleanupSkipped,
  getInitialState,
  restoreOriginalStateEnabled,
  restoreOriginalStateSkipped,
  restoreUnstagedChangesSkipped,
  shouldHidePartiallyStagedFiles,
  shouldRestoreUnstagedChanges,
  shouldRestoreUntrackedFiles,
  updateIndexSkipped,
} from './state.js'
import { ConfigNotFoundError, GetStagedFilesError, GitRepoError } from './symbols.js'

const debugLog = createDebug('lint-staged:runAll')

/**
 * @param {Logger} logger
 * @param {boolean} quiet
 * @returns {Logger}
 */
const configureLogger = (logger, quiet) => {
  if (quiet) {
    const noop = () => {}
    return { error: logger.error, log: noop, warn: noop }
  }

  return logger
}

/**
 * @param {ReturnType<typeof getInitialState>} ctx context
 * @param {unknown} cause error cause
 */
const createError = (ctx, cause) =>
  Object.assign(new Error('lint-staged failed', { cause }), { ctx })

/**
 * Executes all tasks and either resolves or rejects the promise
 *
 * @param {object} options
 * @param {boolean} [options.allowEmpty] - Allow empty commits when tasks revert all staged changes
 * @param {boolean | number} [options.concurrent] - The number of tasks to run concurrently, or false to run tasks serially
 * @param {Object} [options.configObject] - Explicit config object from the js API
 * @param {string} [options.configPath] - Explicit path to a config file
 * @param {boolean} [options.continueOnError] - Run all tasks to completion even if one fails
 * @param {string} [options.cwd] - Current working directory
 * @param {string} [options.diff] - Override the default "--staged" flag of "git diff" to get list of files
 * @param {string} [options.diffFilter] - Override the default "--diff-filter=ACMR" flag of "git diff" to get list of files
 * @param {boolean} [options.failOnChanges] - Fail with exit code 1 when tasks modify tracked files
 * @param {boolean} [options.hidePartiallyStaged] - Whether to hide unstaged changes from partially staged files before running tasks
 * @param {boolean} [options.hideUnstaged] - Whether to hide all unstaged changes before running tasks
 * @param {number} [options.maxArgLength] - Maximum argument string length
 * @param {boolean} [options.quiet] - Disable lint-staged's own console output
 * @param {boolean} [options.relative] - Pass relative filepaths to tasks
 * @param {boolean} [options.revert] - revert to original state in case of errors
 * @param {boolean} [options.stash] - Enable the backup stash, and revert in case of errors
 * @param {boolean} [options.verbose] - Show task output even when tasks succeed; by default only failed output is shown
 * @param {Logger} logger
 * @returns {Promise}
 */
export const runAll = async (
  {
    allowEmpty = false,
    concurrent = true,
    configObject,
    configPath,
    continueOnError = false,
    cwd,
    diff,
    diffFilter,
    failOnChanges = false,
    hideAll = false,
    hideUnstaged = false,
    hidePartiallyStaged = !(hideAll || hideUnstaged),
    maxArgLength,
    quiet = false,
    relative = false,
    // Stashing should be disabled by default when the `diff` option is used
    stash = diff === undefined,
    // Cannot revert to original state without stash
    revert = stash,
    verbose = false,
  },
  logger = console
) => {
  const thisLogger = configureLogger(logger, quiet)

  debugLog('Running all tasks...')

  // Resolve relative CWD option
  const hasExplicitCwd = !!cwd
  cwd = hasExplicitCwd ? path.resolve(cwd) : process.cwd()
  debugLog('Using working directory `%s`', cwd)

  const ctx = getInitialState({
    failOnChanges,
    hideAll,
    hideUnstaged,
    hidePartiallyStaged,
    quiet,
    revert,
  })

  const { topLevelDir, gitConfigDir } = await resolveGitRepo(cwd)
  if (!topLevelDir) {
    if (!quiet) ctx.output.push(notGitRepo())
    ctx.errors.add(GitRepoError)
    throw createError(ctx, GitRepoError)
  }

  // Test whether we have any commits or not.
  // Stashing must be disabled with no initial commit.
  const hasInitialCommit = await execGit(['log', '-1'], { cwd: topLevelDir })
    .then(() => true)
    .catch(() => false)

  // Lint-staged will create a backup stash only when there's an initial commit,
  // and when using the default list of staged files by default
  ctx.shouldBackup = hasInitialCommit && stash
  if (!ctx.shouldBackup) {
    thisLogger.warn(skippingBackup(hasInitialCommit, diff))
  }

  if (!ctx.shouldHidePartiallyStaged && !ctx.shouldHideUnstaged && !ctx.shouldHideAll) {
    thisLogger.warn(skippingHidePartiallyChanged())
  }

  // Run staged files retrieval and config search in parallel since they're independent
  const [stagedFiles, foundConfigs] = await Promise.all([
    getStagedFiles({ cwd: topLevelDir, gitConfigDir, diff, diffFilter }),
    searchConfigs({ configObject, configPath, cwd, topLevelDir }, thisLogger),
  ])

  if (!stagedFiles) {
    if (!quiet) ctx.output.push(failedGetStagedFiles())
    ctx.errors.add(GetStagedFilesError)
    throw createError(ctx, GetStagedFilesError)
  }
  debugLog('Loaded list of staged files in git:\n%O', stagedFiles)

  // If there are no files avoid executing any lint-staged logic
  if (stagedFiles.length === 0) {
    if (!quiet) ctx.output.push(noStagedFiles())
    return ctx
  }

  const numberOfConfigs = Object.keys(foundConfigs).length

  // Throw if no configurations were found
  if (numberOfConfigs === 0) {
    ctx.errors.add(ConfigNotFoundError)
    throw createError(ctx, ConfigNotFoundError)
  }

  const filesByConfig = await groupFilesByConfig({
    configs: foundConfigs,
    files: stagedFiles,
    singleConfigMode: configObject || configPath !== undefined,
  })

  const hasMultipleConfigs = numberOfConfigs > 1

  // lint-staged 10 will automatically add modifications to index
  // Warn user when their command includes `git add`
  let hasDeprecatedGitAdd = false

  const tasks = []

  // Set of all staged files that matched a task glob. Values in a set are unique.
  /** @type {Set<import('./getStagedFiles.js').StagedFile>} */
  const matchedFiles = new Set()

  const abortController = getAbortController()

  for (const [groupConfigPath, { config, files }] of Object.entries(filesByConfig)) {
    const configName = groupConfigPath
      ? normalizePath(path.relative(cwd, groupConfigPath))
      : 'Config object'

    // Use actual cwd if it's specified, or there's only a single config file.
    // Otherwise use the directory of the config file for each config group,
    // to make sure tasks are separated from each other.
    const groupCwd = hasExplicitCwd || !hasMultipleConfigs ? cwd : path.dirname(groupConfigPath)

    const configTasks = await Promise.all(
      generateTasks({ config, cwd: groupCwd, files, relative }).map((task) =>
        (isFunctionTask(task.commands)
          ? getFunctionTask({
              abortController,
              command: task.commands,
              continueOnError,
              files: task.fileList,
            })
          : getSpawnedTasks({
              abortController,
              commands: task.commands,
              continueOnError,
              cwd: groupCwd,
              files: task.fileList,
              maxArgLength,
              topLevelDir,
              verbose,
            })
        ).then((subTasks) => {
          // Add files from task to match set
          task.fileList.forEach((file) => {
            // Make sure relative files are normalized to the
            // group cwd, because other there might be identical
            // relative filenames in the entire set.
            const normalizedFile = path.isAbsolute(file.filepath)
              ? file
              : {
                  filepath: normalizePath(path.join(groupCwd, file.filepath)),
                  status: file.status,
                }

            matchedFiles.add(normalizedFile)
          })

          const includesGitAdd = (subTask) => subTask.title.includes('git add')

          hasDeprecatedGitAdd =
            hasDeprecatedGitAdd ||
            subTasks.some((subTask) =>
              Array.isArray(subTask) ? subTask.some(includesGitAdd) : includesGitAdd(subTask)
            )

          const fileCount = task.fileList.length

          return {
            title: `${task.pattern}${dim(` — ${fileCount} ${fileCount === 1 ? 'file' : 'files'}`)}`,
            task: subTasks,
            skip: () => {
              // Skip task when no files matched
              if (fileCount === 0) {
                return `${task.pattern}${dim(' — no files')}`
              }

              return false
            },
          }
        })
      )
    )

    tasks.push({
      title: `${configName}${dim(` — ${files.length} ${files.length > 1 ? 'files' : 'file'}`)}`,
      task: configTasks,
      skip: () => {
        // Skip chunk when no every task is skipped (due to no matches)
        if (configTasks.every((task) => task.skip())) {
          return `${configName}${dim(' — no tasks to run')}`
        }

        return false
      },
    })
  }

  if (hasDeprecatedGitAdd) {
    thisLogger.warn(deprecatedGitAdd())
  }

  if (tasks.every((task) => task.skip())) {
    if (!quiet) ctx.output.push(noTasks())
    return ctx
  }

  const git = new GitWorkflow({
    allowEmpty,
    diff,
    diffFilter,
    failOnChanges,
    gitConfigDir,
    logger: thisLogger,
    matchedFiles,
    maxArgLength,
    topLevelDir,
  })

  await git.prepare(ctx)

  if (shouldHidePartiallyStagedFiles(ctx)) {
    await git.hidePartiallyStagedChanges(ctx)
  }

  if (abortController.signal.aborted || ctx.errors.size > 0) {
    thisLogger.log(`${figures.cancelled()} ${dim(`Skipped running tasks…`)}`)
  } else {
    await git.runTasks(ctx, tasks, { abortController, concurrent })
  }

  if (updateIndexSkipped(ctx)) {
    thisLogger.log(`${figures.cancelled()} ${dim('Skipped staging changes from tasks…')}`)
  } else {
    await git.updateIndex(ctx)
  }

  if (shouldRestoreUnstagedChanges(ctx)) {
    if (restoreUnstagedChangesSkipped(ctx)) {
      thisLogger.log(`${figures.cancelled()} ${dim('Skipped restoring unstaged changes…')}`)
    } else {
      await git.restoreUnstagedChanges(ctx)
    }
  }

  if (shouldRestoreUntrackedFiles(ctx)) {
    if (restoreUnstagedChangesSkipped(ctx)) {
      thisLogger.log(`${figures.cancelled()} ${dim('Skipped restoring untracked files…')}`)
    } else {
      await git.restoreUntrackedFiles(ctx)
    }
  }

  if (restoreOriginalStateEnabled(ctx)) {
    if (restoreOriginalStateSkipped(ctx)) {
      thisLogger.log(
        `${figures.cancelled()} ${dim('Skipped reverting to original state because of errors…')}`
      )
    } else {
      await git.restoreOriginalState(ctx)
    }
  }

  if (cleanupEnabled(ctx)) {
    if (cleanupSkipped(ctx)) {
      thisLogger.log(`${figures.cancelled()} ${dim('Skipped cleaning up temporary files…')}`)
    } else {
      await git.cleanup(ctx)
    }
  }

  if (ctx.errors.size > 0) {
    throw createError(ctx)
  }

  return ctx
}
