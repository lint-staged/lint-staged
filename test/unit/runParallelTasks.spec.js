import makeConsoleMock from 'consolemock'
import { describe, it, test, vi } from 'vitest'

import { parseConcurrency, runParallelTasks } from '../../lib/runParallelTasks.js'

const createTaskGroup = (title, task, skip = vi.fn(() => false)) => ({ title, task, skip })

const createTask = (title, task = vi.fn()) => ({ task, title })

describe('runParallelTasks', () => {
  it('should run visible tasks and report their status', async ({ expect }) => {
    const ctx = {}
    const skipped = vi.fn()
    const first = vi.fn()
    const failure = vi.fn().mockRejectedValue(new Error('test'))
    const last = vi.fn()
    const logger = makeConsoleMock()

    const tasks = [
      createTaskGroup(
        'skipped config',
        [createTaskGroup('*.md', [createTask('skipped', skipped)])],
        () => true
      ),
      createTaskGroup('config', [
        createTaskGroup('*.css', [createTask('skipped', skipped)], () => true),
        createTaskGroup('*.js', [
          createTask('first', first),
          createTask('failure', failure),
          createTask('last', last),
        ]),
      ]),
    ]

    await runParallelTasks(ctx, tasks, {
      abortController: new AbortController(),
      logger,
    })

    expect(skipped).not.toHaveBeenCalled()
    expect(first).toHaveBeenCalledWith(ctx)
    expect(failure).toHaveBeenCalledWith(ctx)
    expect(last).toHaveBeenCalledWith(ctx)

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      LOG     config
      LOG       *.js
      LOG         ⋯ first
      LOG         ⋯ failure
      LOG         ⋯ last
      LOG 
      LOG ✔ first
      ERROR ✖ failure
      LOG ✔ last
      LOG "
    `)
  })

  it.for([
    ['serially when concurrent is false', false, 1],
    ['without a limit by default', undefined, 3],
    ['up to a numeric concurrency limit', 2, 2],
  ])('should run glob groups %s', async ([, concurrent, expected], { expect }) => {
    const gate = Promise.withResolvers()
    let active = 0
    let maxActive = 0
    const runs = Array.from({ length: 3 }, () =>
      vi.fn(async () => {
        active++
        maxActive = Math.max(maxActive, active)
        await gate.promise
        active--
      })
    )
    const tasks = runs.map((run, index) =>
      createTaskGroup(`config ${index}`, [
        createTaskGroup(`glob ${index}`, [createTask(`task ${index}`, run)]),
      ])
    )

    const promise = runParallelTasks({}, tasks, {
      abortController: new AbortController(),
      concurrent,
    })

    await vi.waitFor(() => expect(active).toBe(expected))
    gate.resolve()
    await promise

    expect(maxActive).toBe(expected)
    for (const run of runs) {
      expect(run).toHaveBeenCalledOnce()
    }
  })

  it('should run tasks within each glob serially', async ({ expect }) => {
    const gate = Promise.withResolvers()
    const first = vi.fn(() => gate.promise)
    const second = vi.fn()
    const parallel = vi.fn()
    const tasks = [
      createTaskGroup('config', [
        createTaskGroup('first glob', [createTask('first', first), createTask('second', second)]),
        createTaskGroup('second glob', [createTask('parallel', parallel)]),
      ]),
    ]

    const promise = runParallelTasks({}, tasks, {
      abortController: new AbortController(),
    })

    await vi.waitFor(() => expect(first).toHaveBeenCalledOnce())
    expect(second).not.toHaveBeenCalled()
    expect(parallel).toHaveBeenCalledOnce()

    gate.resolve()
    await promise

    expect(second).toHaveBeenCalledOnce()
  })

  it('should support nested arrays for a glob to run in parallel', async ({ expect }) => {
    const first = vi.fn()
    const second = vi.fn()

    // These run in parallel, but the timeout value determines which one is fastest
    const parallel_1 = vi.fn(() => new Promise((resolve) => void setTimeout(resolve, 30)))
    const parallel_2 = vi.fn(() => new Promise((resolve) => void setTimeout(resolve, 20)))
    const parallel_3 = vi.fn(() => new Promise((resolve) => void setTimeout(resolve, 10)))

    const fourth = vi.fn()

    const tasks = [
      createTaskGroup('lint-staged.config.json', [
        createTaskGroup('*.js', [
          createTask('first', first),
          createTask('second', second),
          [
            createTask('parallel_1', parallel_1),
            createTask('parallel_2', parallel_2),
            createTask('parallel_3', parallel_3),
          ],
          createTask('fourth', fourth),
        ]),
      ]),
    ]

    const logger = makeConsoleMock()

    await runParallelTasks({}, tasks, {
      abortController: new AbortController(),
      logger,
    })

    // Notice in the log output the order or finished parallel tasks
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      LOG     *.js
      LOG       ⋯ first
      LOG       ⋯ second
      LOG       ┌ ⋯ parallel_1
      LOG       │ ⋯ parallel_2
      LOG       └ ⋯ parallel_3
      LOG       ⋯ fourth
      LOG 
      LOG ✔ first
      LOG ✔ second
      LOG ✔ parallel_3
      LOG ✔ parallel_2
      LOG ✔ parallel_1
      LOG ✔ fourth
      LOG "
    `)
  })

  it('should stop pending tasks when aborted', async ({ expect }) => {
    const gate = Promise.withResolvers()
    const abortController = new AbortController()
    const logger = makeConsoleMock()
    const first = vi.fn(() => gate.promise)
    const pending = vi.fn()
    const later = vi.fn()
    const tasks = [
      createTaskGroup('config', [
        createTaskGroup('first glob', [createTask('first', first), createTask('pending', pending)]),
        createTaskGroup('second glob', [createTask('later', later)]),
      ]),
    ]

    const promise = runParallelTasks({}, tasks, {
      abortController,
      concurrent: false,
      logger,
    })

    await vi.waitFor(() => expect(first).toHaveBeenCalledOnce())
    abortController.abort()
    gate.resolve()
    await promise

    expect(pending).not.toHaveBeenCalled()
    expect(later).not.toHaveBeenCalled()

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      LOG     first glob
      LOG       ⋯ first
      LOG       ⋯ pending
      LOG     second glob
      LOG       ⋯ later
      LOG 
      LOG ✔ first
      WARN ↓ pending
      WARN ↓ later
      LOG "
    `)
  })

  it('should handle an empty task list', async ({ expect }) => {
    const logger = makeConsoleMock()

    await runParallelTasks({}, [], {
      abortController: new AbortController(),
      logger,
    })

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      LOG 
      LOG "
    `)
  })

  test('parseConcurrency', ({ expect }) => {
    expect(parseConcurrency(0)).toBe(1)
    expect(parseConcurrency(false)).toBe(1)
    expect(parseConcurrency(true)).toBe(Infinity)
    expect(parseConcurrency(42)).toBe(42)
    expect(parseConcurrency(0.4)).toBe(1)
    expect(parseConcurrency(1.2)).toBe(1)
    expect(parseConcurrency(NaN)).toBe(1)
    expect(parseConcurrency(Infinity)).toBe(Infinity)
  })
})
