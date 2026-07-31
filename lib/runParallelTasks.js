import * as colors from './colors.js'
import { createDebug } from './debug.js'
import * as figures from './figures.js'

const debugLog = createDebug('lint-staged:runParallelTasks')

/** @param {Number | boolean} options.concurrent Boolean value for whether to run concurrently */
export const parseConcurrency = (concurrent) => {
  if (concurrent === true || concurrent === Infinity) {
    return Infinity
  }

  if (concurrent === false || concurrent < 1 || !Number.isInteger(concurrent)) {
    return 1
  }

  return concurrent
}

/**
 * @param {Object} ctx
 * @param {Array} tasks
 * @param {Object} options
 * @param {AbortController} abortController
 * @param {Number | boolean} [options.concurrent=true] Boolean value for whether to run concurrently,
 * or a number value controls the number of concurrent executions
 */
export const runParallelTasks = async (
  ctx,
  tasks,
  { abortController, concurrent = true, logger }
) => {
  const concurrency = parseConcurrency(concurrent)

  debugLog('Running parallel tasks with concurrency:', concurrency)

  const indent = tasks.length > 1 ? '    ' : '  '
  const allPerGlobTasks = []

  // the array of actual tasks is split per config and per glob
  for (const perConfig of tasks) {
    if (perConfig.skip()) {
      debugLog('Skipped configuration:', perConfig.title)
    } else {
      debugLog('Running configuration:', perConfig.title)

      if (tasks.length > 1) {
        // display name of config only when there are multiple
        logger?.log(colors.dim(`${indent}${perConfig.title}`))
      }
    }

    for (const perGlob of perConfig.task) {
      if (perConfig.skip()) {
        continue // entire group is skipped, but debug logs still show above
      }

      if (perGlob.skip()) {
        debugLog('Skipped glob from configuration:', perConfig.title, perGlob.title)
        continue
      }

      debugLog('Running glob:', perGlob.title)
      logger?.log(colors.dim(`${indent}  ${perGlob.title}`))

      for (const sequentialTask of perGlob.task) {
        if (Array.isArray(sequentialTask)) {
          debugLog(
            `Running ${sequentialTask.length} parallel tasks:`,
            ...sequentialTask.map((t) => t.title)
          )

          sequentialTask.forEach((parallelTask, index) => {
            if (index === 0) {
              logger?.log(
                `${indent}    ${figures.parallelGroupStart()} ${figures.wip()} ${parallelTask.title}`
              )
            } else {
              const groupFigure =
                index === sequentialTask.length - 1
                  ? figures.parallelGroupStop()
                  : figures.parallelGroupMiddle()

              logger?.log(`${indent}    ${groupFigure} ${figures.wip()} ${parallelTask.title}`)
            }
          })
        } else {
          debugLog('Running task:', sequentialTask.title)
          logger?.log(`${indent}    ${figures.wip()} ${sequentialTask.title}`)
        }
      }

      // per-glob tasks run serially, but it might be a nested array which runs in parallel
      allPerGlobTasks.push(perGlob.task)
    }
  }

  logger?.log('') // empty line before all tasks

  const runSingle = async ({ title, task }) => {
    if (abortController.signal.aborted) {
      debugLog('Skipped task because aborted:', title)
      // Log all aborted tasks without actually running them
      logger?.warn(`${figures.cancelled()} ${title}`)
      return
    }

    try {
      debugLog('Running task:', title)
      await task(ctx)
      debugLog('Done running task:', title)
      logger?.log(`${figures.done()} ${title}`)
    } catch {
      debugLog('Failed to run task:', title)
      logger?.error(colors.red(`${figures.error()} ${title}`))
    }
  }

  const runSequential = async (sequentialTasks) => {
    for (const sequentialOrParallel of sequentialTasks) {
      if (Array.isArray(sequentialOrParallel)) {
        await Promise.all(sequentialOrParallel.map(runSingle))
      } else {
        await runSingle(sequentialOrParallel)
      }
    }
  }

  let next = 0
  const worker = async () => {
    while (next < allPerGlobTasks.length) {
      const perGlobTasks = allPerGlobTasks[next++]
      await runSequential(perGlobTasks)
    }
  }

  const length = Math.min(allPerGlobTasks.length, concurrency)
  debugLog('Running workers with concurrency:', length)
  await Promise.all(Array.from({ length }, worker))
  debugLog('Done running workers')

  logger?.log('') // empty line after all tasks
}
