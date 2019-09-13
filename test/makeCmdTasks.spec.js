import execa from 'execa'
import makeCmdTasks from '../lib/makeCmdTasks'

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
      files: ['test.js']
    })
    expect(res.length).toBe(2)
    const [linter1, linter2] = res
    expect(linter1.title).toBe('test')
    expect(linter2.title).toBe('test2')

    let taskPromise = linter1.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('test test.js', {
      preferLocal: true,
      reject: false,
      shell: false
    })
    taskPromise = linter2.task()
    expect(taskPromise).toBeInstanceOf(Promise)
    await taskPromise
    expect(execa).toHaveBeenCalledTimes(2)
    expect(execa).lastCalledWith('test2 test.js', {
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should work with function linter returning a string', async () => {
    const res = await makeCmdTasks({ commands: () => 'test', gitDir, files: ['test.js'] })
    expect(res.length).toBe(1)
    expect(res[0].title).toEqual('test')
  })

  it('should work with function linter returning array of string', async () => {
    const res = await makeCmdTasks({
      commands: () => ['test', 'test2'],
      gitDir,
      files: ['test.js']
    })
    expect(res.length).toBe(2)
    expect(res[0].title).toEqual('test')
    expect(res[1].title).toEqual('test2')
  })

  it('should work with function linter accepting arguments', async () => {
    const res = await makeCmdTasks({
      commands: filenames => filenames.map(file => `test ${file}`),
      gitDir,
      files: ['test.js', 'test2.js']
    })
    expect(res.length).toBe(2)
    expect(res[0].title).toEqual('test [file]')
    expect(res[1].title).toEqual('test [file]')
  })

  it('should work with array of mixed string and function linters', async () => {
    const res = await makeCmdTasks({
      commands: [() => 'test', 'test2', files => files.map(file => `test ${file}`)],
      gitDir,
      files: ['test.js', 'test2.js', 'test3.js']
    })
    expect(res.length).toBe(5)
    expect(res[0].title).toEqual('test')
    expect(res[1].title).toEqual('test2')
    expect(res[2].title).toEqual('test [file]')
    expect(res[3].title).toEqual('test [file]')
    expect(res[4].title).toEqual('test [file]')
  })

  it('should generate short names for function tasks with long file list', async () => {
    const res = await makeCmdTasks({
      commands: filenames => `test ${filenames.map(file => `--file ${file}`).join(' ')}`,
      gitDir,
      files: Array(100).fill('file.js') // 100 times `file.js`
    })
    expect(res.length).toBe(1)
    expect(res[0].title).toEqual('test --file [file]')
  })
})
