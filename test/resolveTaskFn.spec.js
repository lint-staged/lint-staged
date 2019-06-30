import execa from 'execa'
import resolveTaskFn from '../src/resolveTaskFn'

const defaultOpts = { pathsToLint: ['test.js'] }

describe('resolveTaskFn', () => {
  beforeEach(() => {
    execa.mockClear()
  })

  it('should support non npm scripts', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      linter: 'node --arg=true ./myscript.js'
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should support function linters that return string', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      linter: filenames => `node --arg=true ./myscript.js ${filenames}`
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should support function linters that return array of strings', async () => {
    expect.assertions(3)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      pathsToLint: ['foo.js', 'bar.js'],
      linter: filenames => filenames.map(filename => `node --arg=true ./myscript.js ${filename}`)
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(2)
    expect(execa).nthCalledWith(1, 'node', ['--arg=true', './myscript.js', 'foo.js'], {
      preferLocal: true,
      reject: false,
      shell: false
    })
    expect(execa).nthCalledWith(2, 'node', ['--arg=true', './myscript.js', 'bar.js'], {
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should pass `gitDir` as `cwd` to `execa()` gitDir !== process.cwd for git commands', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      linter: 'git add',
      gitDir: '../'
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('git', ['add', 'test.js'], {
      cwd: '../',
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should not pass `gitDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({ ...defaultOpts, linter: 'jest', gitDir: '../' })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('jest', ['test.js'], {
      preferLocal: true,
      reject: false,
      shell: false
    })
  })

  it('should throw error for failed linters', async () => {
    expect.assertions(1)
    execa.mockResolvedValueOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: true,
      cmd: 'mock cmd'
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, linter: 'mock-fail-linter' })
    try {
      await taskFn()
    } catch (err) {
      expect(err.privateMsg).toMatchInlineSnapshot(`
"


× mock-fail-linter found some errors. Please fix them and try committing again.
Mock error"
`)
    }
  })

  it('should throw error for killed processes', async () => {
    expect.assertions(1)
    execa.mockResolvedValueOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: false,
      killed: false,
      signal: 'SIGINT',
      cmd: 'mock cmd'
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, linter: 'mock-killed-linter' })
    try {
      await taskFn()
    } catch (err) {
      expect(err.privateMsg).toMatchInlineSnapshot(`
"


‼ mock-killed-linter was terminated with SIGINT"
`)
    }
  })

  it('should not set hasErrors on context if no error occur', async () => {
    expect.assertions(1)
    const context = {}
    const taskFn = resolveTaskFn({ ...defaultOpts, linter: 'jest', gitDir: '../' })
    await taskFn(context)
    expect(context.hasErrors).toBeUndefined()
  })

  it('should set hasErrors on context to true on error', async () => {
    execa.mockResolvedValueOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: true,
      cmd: 'mock cmd'
    })
    const context = {}
    const taskFn = resolveTaskFn({ ...defaultOpts, linter: 'mock-fail-linter' })
    expect.assertions(1)
    try {
      await taskFn(context)
    } catch (err) {
      expect(context.hasErrors).toEqual(true)
    }
  })

  it('should call execa with shell when configured so', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      linter: 'node --arg=true ./myscript.js',
      shell: true
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      preferLocal: true,
      reject: false,
      shell: true
    })
  })
})
