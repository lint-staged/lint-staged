import { mockExeca } from './utils/mockExeca.js'

const { execa } = await mockExeca()

const { makeCmdTasks } = await import('../lib/makeCmdTasks')

describe('makeCmdTasks', () => {
  const gitDir = process.cwd()

  beforeEach(() => {
    execa.mockClear()
  })

  it('should return an array', async () => {
    const array = await makeCmdTasks({ commands: 'test', gitDir, files: ['test.js'] })
    expect(array).toBeInstanceOf(Array)
  })

  it('should work with a single command', async () => {
    expect.assertions(4)
    const res = await makeCmdTasks({ commands: 'test', gitDir, files: ['test.js'] })
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
      gitDir,
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
    expect(execa).lastCalledWith('test', ['test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
    })
    taskPromise = linter2.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(execa).toHaveBeenCalledTimes(2)
    expect(execa).lastCalledWith('test2', ['test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
    })
  })

  it('should work with function task returning a string', async () => {
    const res = await makeCmdTasks({ commands: () => 'test', gitDir, files: ['test.js'] })
    expect(res.length).toBe(1)
    expect(res[0].title).toEqual('test')
  })

  it('should work with function task returning array of string', async () => {
    const res = await makeCmdTasks({
      commands: () => ['test', 'test2'],
      gitDir,
      files: ['test.js'],
    })
    expect(res.length).toBe(2)
    expect(res[0].title).toEqual('test')
    expect(res[1].title).toEqual('test2')
  })

  it('should work with function task accepting arguments', async () => {
    const res = await makeCmdTasks({
      commands: (filenames) => filenames.map((file) => `test ${file}`),
      gitDir,
      files: ['test.js', 'test2.js'],
    })
    expect(res.length).toBe(2)
    expect(res[0].title).toEqual('test test.js')
    expect(res[1].title).toEqual('test test2.js')
  })

  it('should work with array of mixed string and function tasks', async () => {
    const res = await makeCmdTasks({
      commands: [() => 'test', 'test2', (files) => files.map((file) => `test ${file}`)],
      gitDir,
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
    const res = await makeCmdTasks({ commands: async () => 'test', gitDir, files: ['test.js'] })
    expect(res.length).toBe(1)
    expect(res[0].title).toEqual('test')
  })

  it("should throw when function task doesn't return string | string[]", async () => {
    await expect(makeCmdTasks({ commands: () => null, gitDir, files: ['test.js'] })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
            "✖ Validation Error:

              Invalid value for '[Function]': null

              Function task should return a string or an array of strings"
          `)
  })
})
