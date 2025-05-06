import { getMockExeca } from './__utils__/getMockExeca.js'

const { execa } = await getMockExeca()

const { makeCmdTasks } = await import('../../lib/makeCmdTasks.js')

describe('makeCmdTasks', () => {
  const topLevelDir = process.cwd()

  beforeEach(() => {
    execa.mockClear()
  })

  it('should return an array', async () => {
    const array = await makeCmdTasks({ commands: 'test', topLevelDir, files: ['test.js'] })
    expect(array).toBeInstanceOf(Array)
  })

  it('should work with a single command', async () => {
    expect.assertions(4)
    const res = await makeCmdTasks({ commands: 'test', topLevelDir, files: ['test.js'] })
    expect(res.length).toBe(1)
    const [linter] = res
    expect(linter.title).toBe('test')
    expect(linter.task).toBeInstanceOf(Function)
    const taskPromise = linter.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
  })

  it('should work with multiple commands', async () => {
    expect.assertions(9)
    const res = await makeCmdTasks({
      commands: ['test', 'test2'],
      topLevelDir,
      files: ['test.js'],
    })
    expect(res.length).toBe(2)
    const [linter1, linter2] = res
    expect(linter1.title).toBe('test')
    expect(linter2.title).toBe('test2')

    let taskPromise = linter1.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).toHaveBeenLastCalledWith('test', ['test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
      stdin: 'ignore',
    })
    taskPromise = linter2.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(execa).toHaveBeenCalledTimes(2)
    expect(execa).toHaveBeenLastCalledWith('test2', ['test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
      stdin: 'ignore',
    })
  })

  it('should work with function task returning a string', async () => {
    const res = await makeCmdTasks({ commands: () => 'test', topLevelDir, files: ['test.js'] })
    expect(res.length).toBe(1)
    expect(res[0].title).toEqual('test')
  })

  it('should work with function task returning array of string', async () => {
    const res = await makeCmdTasks({
      commands: () => ['test', 'test2'],
      topLevelDir,
      files: ['test.js'],
    })
    expect(res.length).toBe(2)
    expect(res[0].title).toEqual('test')
    expect(res[1].title).toEqual('test2')
  })

  it('should work with function task accepting arguments', async () => {
    const res = await makeCmdTasks({
      commands: (filenames) => filenames.map((file) => `test ${file}`),
      topLevelDir,
      files: ['test.js', 'test2.js'],
    })
    expect(res.length).toBe(2)
    expect(res[0].title).toEqual('test test.js')
    expect(res[1].title).toEqual('test test2.js')
  })

  it('should work with array of mixed string and function tasks', async () => {
    const res = await makeCmdTasks({
      commands: [() => 'test', 'test2', (files) => files.map((file) => `test ${file}`)],
      topLevelDir,
      files: ['test.js', 'test2.js', 'test3.js'],
    })
    expect(res.length).toBe(5)
    expect(res[0].title).toEqual('test')
    expect(res[1].title).toEqual('test2')
    expect(res[2].title).toEqual('test test.js')
    expect(res[3].title).toEqual('test test2.js')
    expect(res[4].title).toEqual('test test3.js')
  })

  it('should work with async function tasks', async () => {
    const res = await makeCmdTasks({
      commands: async () => 'test',
      topLevelDir,
      files: ['test.js'],
    })
    expect(res.length).toBe(1)
    expect(res[0].title).toEqual('test')
  })

  it("should throw when function task doesn't return string | string[]", async () => {
    await expect(makeCmdTasks({ commands: () => null, topLevelDir, files: ['test.js'] })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "✖ Validation Error:

              Invalid value for '[Function]': null

              Function task should return a string or an array of strings"
          `)
  })

  it('should prevent function from mutating original file list', async () => {
    const files = ['test.js']

    const res = await makeCmdTasks({
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
