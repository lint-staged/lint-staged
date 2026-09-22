import { exec } from 'tinyexec'
import { beforeEach, describe, it, vi } from 'vitest'

import { getAbortController } from '../../lib/getAbortController.js'
import { runParallelTasks } from '../../lib/runParallelTasks.js'
const { getSpawnedTasks } = await import('../../lib/getSpawnedTasks.js')

vi.mock('tinyexec', () => ({
  exec: vi.fn().mockReturnValue({
    async *[Symbol.asyncIterator]() {
      yield 'test'
    },
  }),
}))

const abortController = getAbortController()

describe('getSpawnedTasks', () => {
  const topLevelDir = process.cwd()

  beforeEach(() => {
    vi.mocked(exec).mockClear()
  })

  it('should return an array', async ({ expect }) => {
    const array = await getSpawnedTasks({
      abortController,
      commands: 'test',
      topLevelDir,
      files: [{ filepath: 'test.js', status: 'M' }],
    })
    expect(array).toBeInstanceOf(Array)
  })

  it('should work with a single command', async ({ expect }) => {
    expect.assertions(4)
    const res = await getSpawnedTasks({
      abortController,
      commands: 'test',
      topLevelDir,
      files: [{ filepath: 'test.js', status: 'M' }],
    })
    expect(res.length).toBe(1)
    const [linter] = res
    expect(linter.title).toBe('test')
    expect(linter.task).toBeInstanceOf(Function)
    const taskPromise = linter.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
  })

  it('should work with multiple commands', async ({ expect }) => {
    expect.assertions(9)
    const res = await getSpawnedTasks({
      abortController,
      commands: ['test', 'test2'],
      topLevelDir,
      files: [{ filepath: 'test.js', status: 'M' }],
    })
    expect(res.length).toBe(2)
    const [linter1, linter2] = res
    expect(linter1.title).toBe('test')
    expect(linter2.title).toBe('test2')

    let taskPromise = linter1.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenLastCalledWith('test', ['test.js'], {
      nodeOptions: {
        cwd: process.cwd(),
        env: { NO_COLOR: 'true' },
      },
    })
    taskPromise = linter2.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(exec).toHaveBeenCalledTimes(2)
    expect(exec).toHaveBeenLastCalledWith('test2', ['test.js'], {
      nodeOptions: {
        cwd: process.cwd(),
        env: { NO_COLOR: 'true' },
      },
    })
  })

  it('should work with function task returning a string', async ({ expect }) => {
    const res = await getSpawnedTasks({
      commands: () => 'test',
      topLevelDir,
      files: [{ filepath: 'test.js', status: 'M' }],
    })
    expect(res.length).toBe(1)
    expect(res[0].title).toEqual('test')
  })

  it('should work with function task returning array of string', async ({ expect }) => {
    const res = await getSpawnedTasks({
      abortController,
      commands: () => ['test', 'test2'],
      topLevelDir,
      files: [{ filepath: 'test.js', status: 'M' }],
    })
    expect(res.length).toBe(2)
    expect(res[0].title).toEqual('test')
    expect(res[1].title).toEqual('test2')
  })

  it('should work with function task accepting arguments', async ({ expect }) => {
    const res = await getSpawnedTasks({
      abortController,
      commands: (filenames) => filenames.map((file) => `test ${file}`),
      topLevelDir,
      files: [
        { filepath: 'test.js', status: 'M' },
        { filepath: 'test2.js', status: 'A' },
      ],
    })
    expect(res.length).toBe(2)
    expect(res[0].title).toEqual('test test.js')
    expect(res[1].title).toEqual('test test2.js')
  })

  it('should work with array of mixed string and function tasks', async ({ expect }) => {
    const res = await getSpawnedTasks({
      abortController,
      commands: [() => 'test', 'test2', (files) => files.map((file) => `test ${file}`)],
      topLevelDir,
      files: [
        { filepath: 'test.js', status: 'M' },
        { filepath: 'test2.js', status: 'A' },
        { filepath: 'test3.js', status: 'R' },
      ],
    })
    expect(res).toHaveLength(3)
    expect(res[0].title).toBe('test')
    expect(res[1].title).toBe('test2')
    expect(res[2].map((task) => task.title)).toEqual([
      'test test.js',
      'test test2.js',
      'test test3.js',
    ])
  })

  it('should work with nested arrays for parallel tasks', async ({ expect }) => {
    const res = await getSpawnedTasks({
      abortController,
      commands: ['first', 'second', ['third', () => 'third'], 'fourth'],
      topLevelDir,
      files: [{ filepath: 'test.js', status: 'M' }],
    })

    expect(res).toHaveLength(4)
    expect(res[0].title).toBe('first')
    expect(res[1].title).toBe('second')
    expect(res[2]).toBeInstanceOf(Array)
    expect(res[2]).toHaveLength(2)
    expect(res[2][0].title).toBe('third')
    expect(res[2][1].title).toBe('third')
    expect(res[3].title).toBe('fourth')
  })

  it('should work with async function tasks', async ({ expect }) => {
    const res = await getSpawnedTasks({
      abortController,
      commands: async () => 'test',
      topLevelDir,
      files: [{ filepath: 'test.js', status: 'M' }],
    })
    expect(res.length).toBe(1)
    expect(res[0].title).toEqual('test')
  })

  it('should throw when a function returns invalid commands', async ({ expect }) => {
    await expect(
      getSpawnedTasks({
        abortController,
        commands: () => null,
        topLevelDir,
        files: [{ filepath: 'test.js', status: 'M' }],
      })
    ).rejects.toThrow(`✖ Validation Error:

  Invalid value for '[Function]': null

  Commands must be strings, with at most one nested array inside the sequential task list. Function results must preserve this nesting limit.`)
  })

  it.for([
    ['one', () => ['two_1', 'two_2'], 'three'],
    () => ['one', ['two_1', 'two_2'], 'three'],
    ['one', async () => ['two_1', 'two_2'], 'three'],
    async () => ['one', ['two_1', 'two_2'], 'three'],
  ])(
    'runs generated parallel groups between sequential tasks: %j',
    async (commands, { expect }) => {
      const started = []
      const bothStarted = Promise.withResolvers()
      const finishParallel = Promise.withResolvers()
      const controller = getAbortController()
      const task = await getSpawnedTasks({
        abortController: controller,
        commands,
        topLevelDir,
        files: [{ filepath: 'test.js', status: 'M' }],
      })

      await vi.mocked(exec).withImplementation(
        (command) => ({
          async *[Symbol.asyncIterator]() {
            started.push(command)
            if (command.startsWith('two_')) {
              if (started.includes('two_1') && started.includes('two_2')) bothStarted.resolve()
              await finishParallel.promise
            }
            yield ''
          },
        }),
        async () => {
          const execution = runParallelTasks(
            {},
            [{ skip: () => false, task: [{ skip: () => false, task }] }],
            { abortController: controller, concurrent: false }
          )

          await bothStarted.promise
          expect(started).toEqual(['one', 'two_1', 'two_2'])
          finishParallel.resolve()
          await execution
          expect(started).toEqual(['one', 'two_1', 'two_2', 'three'])
          expect(exec).toHaveBeenCalledWith('two_1', [], expect.any(Object))
          expect(exec).toHaveBeenCalledWith('two_2', [], expect.any(Object))
          expect(exec).toHaveBeenCalledWith(
            'one',
            typeof commands === 'function' ? [] : ['test.js'],
            expect.any(Object)
          )
        }
      )
    }
  )

  it('should prevent function from mutating original file list', async ({ expect }) => {
    const files = ['test.js']

    const res = await getSpawnedTasks({
      abortController,
      commands: (stagedFiles) => {
        /** Array.splice() mutates the array */
        stagedFiles.splice(0, 1)
        expect(stagedFiles).toEqual([])
        return stagedFiles.map((file) => `test ${file}`)
      },
      topLevelDir,
      files,
    })

    /** Because function mutated file list, it was empty and no tasks were created... */
    expect(res.length).toBe(0)

    /** ...but the original file list was not mutated */
    expect(files).toEqual(['test.js'])
  })
})
