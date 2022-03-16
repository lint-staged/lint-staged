import execa from 'execa'

import { resolveTaskFn } from '../lib/resolveTaskFn'
import { getInitialState } from '../lib/state'
import { TaskError } from '../lib/symbols'

import { createExecaReturnValue } from './utils/createExecaReturnValue'

const defaultOpts = { files: ['test.js'] }

function mockExecaImplementationOnce(value) {
  execa.mockImplementationOnce(() => createExecaReturnValue(value))
}

describe('resolveTaskFn', () => {
  beforeEach(() => {
    execa.mockClear()
  })

  it('should support non npm scripts', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'node --arg=true ./myscript.js',
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
    })
  })

  it('should not append pathsToLint when isFn', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      isFn: true,
      command: 'node --arg=true ./myscript.js test.js',
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
    })
  })

  it('should not append pathsToLint when isFn and shell', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      isFn: true,
      shell: true,
      command: 'node --arg=true ./myscript.js test.js',
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node --arg=true ./myscript.js test.js', {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: true,
    })
  })

  it('should work with shell', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      shell: true,
      command: 'node --arg=true ./myscript.js',
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node --arg=true ./myscript.js test.js', {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: true,
    })
  })

  it('should work with path to custom shell', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      shell: '/bin/bash',
      command: 'node --arg=true ./myscript.js',
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('node --arg=true ./myscript.js test.js', {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: '/bin/bash',
    })
  })

  it('should pass `gitDir` as `cwd` to `execa()` gitDir !== process.cwd for git commands', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'git diff',
      gitDir: '../',
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('git', ['diff', 'test.js'], {
      cwd: '../',
      preferLocal: true,
      reject: false,
      shell: false,
    })
  })

  it('should not pass `gitDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', gitDir: '../' })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).lastCalledWith('jest', ['test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
    })
  })

  it('should throw error for failed linters', async () => {
    expect.assertions(1)
    mockExecaImplementationOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: true,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-fail-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(`"mock-fail-linter [FAILED]"`)
  })

  it('should throw error for interrupted processes', async () => {
    expect.assertions(1)
    mockExecaImplementationOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: false,
      killed: false,
      signal: 'SIGINT',
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-killed-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-killed-linter [SIGINT]"`
    )
  })

  it('should throw error for killed processes without signal', async () => {
    expect.assertions(1)
    mockExecaImplementationOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: false,
      killed: true,
      signal: undefined,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-killed-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-killed-linter [KILLED]"`
    )
  })

  it('should not add TaskError if no error occur', async () => {
    expect.assertions(1)
    const context = getInitialState()
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', gitDir: '../' })
    await taskFn(context)
    expect(context.errors.has(TaskError)).toEqual(false)
  })

  it('should add TaskError on error', async () => {
    mockExecaImplementationOnce({
      stdout: 'Mock error',
      stderr: '',
      code: 0,
      failed: true,
      cmd: 'mock cmd',
    })
    const context = getInitialState()
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-fail-linter' })
    expect.assertions(2)
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-fail-linter [FAILED]"`
    )
    expect(context.errors.has(TaskError)).toEqual(true)
  })

  it('should not add output when there is none', async () => {
    expect.assertions(2)
    mockExecaImplementationOnce({
      stdout: '',
      stderr: '',
      code: 0,
      failed: false,
      killed: false,
      signal: undefined,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd', verbose: true })
    const context = getInitialState()
    await expect(taskFn(context)).resolves.toMatchInlineSnapshot(`undefined`)
    expect(context).toMatchInlineSnapshot(`
      Object {
        "errors": Set {},
        "hasPartiallyStagedFiles": null,
        "output": Array [],
        "quiet": false,
        "shouldBackup": null,
      }
    `)
  })

  it('should add output even when task succeeds if `verbose: true`', async () => {
    expect.assertions(2)
    mockExecaImplementationOnce({
      stdout: 'Mock success',
      stderr: '',
      code: 0,
      failed: false,
      killed: false,
      signal: undefined,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd', verbose: true })
    const context = getInitialState()
    await expect(taskFn(context)).resolves.toMatchInlineSnapshot(`undefined`)
    expect(context).toMatchInlineSnapshot(`
      Object {
        "errors": Set {},
        "hasPartiallyStagedFiles": null,
        "output": Array [
          "
      → mock cmd:
      Mock success",
        ],
        "quiet": false,
        "shouldBackup": null,
      }
    `)
  })

  it('should not add title to output when task errors while quiet', async () => {
    expect.assertions(2)
    mockExecaImplementationOnce({
      stdout: '',
      stderr: 'stderr',
      code: 1,
      failed: true,
      killed: false,
      signal: undefined,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd' })
    const context = getInitialState({ quiet: true })
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(`"mock cmd [1]"`)
    expect(context).toMatchInlineSnapshot(`
      Object {
        "errors": Set {
          Symbol(TaskError),
        },
        "hasPartiallyStagedFiles": null,
        "output": Array [
          "stderr",
        ],
        "quiet": true,
        "shouldBackup": null,
      }
    `)
  })

  it('should not print anything when task errors without output while quiet', async () => {
    expect.assertions(2)
    mockExecaImplementationOnce({
      stdout: '',
      stderr: '',
      code: 1,
      failed: true,
      killed: false,
      signal: undefined,
      cmd: 'mock cmd',
    })

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd' })
    const context = getInitialState({ quiet: true })
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(`"mock cmd [1]"`)
    expect(context).toMatchInlineSnapshot(`
      Object {
        "errors": Set {
          Symbol(TaskError),
        },
        "hasPartiallyStagedFiles": null,
        "output": Array [],
        "quiet": true,
        "shouldBackup": null,
      }
    `)
  })

  it('should kill a long running task when an error is added to the context', async () => {
    execa.mockImplementationOnce(() =>
      createExecaReturnValue(
        {
          stdout: 'a-ok',
          stderr: '',
          code: 0,
          cmd: 'mock cmd',
          failed: false,
          killed: false,
          signal: null,
        },
        1000
      )
    )

    const context = getInitialState()
    const taskFn = resolveTaskFn({ command: 'node' })
    const taskPromise = taskFn(context)

    context.errors.add({})

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [KILLED]"`)
  })
})
