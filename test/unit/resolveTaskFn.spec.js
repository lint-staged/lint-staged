import { jest } from '@jest/globals'

import { getInitialState } from '../../lib/state.js'
import { TaskError } from '../../lib/symbols.js'
import { getMockExeca } from './__utils__/getMockExeca.js'
import { mockExecaReturnValue } from './__utils__/mockExecaReturnValue.js'

const { execa, execaCommand } = await getMockExeca()

jest.unstable_mockModule('pidtree', () => ({
  default: jest.fn(async () => []),
}))

const { default: pidTree } = await import('pidtree')

const { resolveTaskFn } = await import('../../lib/resolveTaskFn.js')

jest.useFakeTimers()

const defaultOpts = { files: ['test.js'] }

describe('resolveTaskFn', () => {
  beforeEach(() => {
    execa.mockClear()
    execaCommand.mockClear()
  })

  it('should support non npm scripts', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'node --arg=true ./myscript.js',
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).toHaveBeenLastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
      stdin: 'ignore',
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
    expect(execa).toHaveBeenLastCalledWith('node', ['--arg=true', './myscript.js', 'test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
      stdin: 'ignore',
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
    expect(execaCommand).toHaveBeenCalledTimes(1)
    expect(execaCommand).toHaveBeenLastCalledWith('node --arg=true ./myscript.js test.js', {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: true,
      stdin: 'ignore',
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
    expect(execaCommand).toHaveBeenCalledTimes(1)
    expect(execaCommand).toHaveBeenLastCalledWith('node --arg=true ./myscript.js test.js', {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: true,
      stdin: 'ignore',
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
    expect(execaCommand).toHaveBeenCalledTimes(1)
    expect(execaCommand).toHaveBeenLastCalledWith('node --arg=true ./myscript.js test.js', {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: '/bin/bash',
      stdin: 'ignore',
    })
  })

  it('shell should work with spaces in file paths', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      shell: true,
      command: 'node --arg=true ./myscript.js',
      files: ['test file.js', 'file with/multiple spaces.js'],
    })

    await taskFn()
    expect(execaCommand).toHaveBeenCalledTimes(1)
    expect(execaCommand).toHaveBeenLastCalledWith(
      'node --arg=true ./myscript.js test\\ file.js file\\ with/multiple\\ spaces.js',
      {
        cwd: process.cwd(),
        preferLocal: true,
        reject: false,
        shell: true,
        stdin: 'ignore',
      }
    )
  })

  it('should pass `topLevelDir` as `cwd` to `execa()` topLevelDir !== process.cwd for git commands', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({
      ...defaultOpts,
      command: 'git diff',
      topLevelDir: '../',
    })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).toHaveBeenLastCalledWith('git', ['diff', 'test.js'], {
      cwd: '../',
      preferLocal: true,
      reject: false,
      shell: false,
      stdin: 'ignore',
    })
  })

  it('should not pass `topLevelDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
    expect.assertions(2)
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', topLevelDir: '../' })

    await taskFn()
    expect(execa).toHaveBeenCalledTimes(1)
    expect(execa).toHaveBeenLastCalledWith('jest', ['test.js'], {
      cwd: process.cwd(),
      preferLocal: true,
      reject: false,
      shell: false,
      stdin: 'ignore',
    })
  })

  it('should throw error for failed tasks', async () => {
    expect.assertions(1)
    execa.mockReturnValueOnce(
      mockExecaReturnValue({
        stdout: 'Mock error',
        stderr: '',
        code: 0,
        failed: true,
        cmd: 'mock cmd',
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-fail-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(`"mock-fail-linter [FAILED]"`)
  })

  it('should throw error for interrupted processes', async () => {
    expect.assertions(1)
    execa.mockReturnValueOnce(
      mockExecaReturnValue({
        stdout: 'Mock error',
        stderr: '',
        code: 0,
        failed: false,
        killed: false,
        signal: 'SIGINT',
        cmd: 'mock cmd',
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-killed-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-killed-linter [SIGINT]"`
    )
  })

  it('should throw error for killed processes without signal', async () => {
    expect.assertions(1)
    execa.mockReturnValueOnce(
      mockExecaReturnValue({
        stdout: 'Mock error',
        stderr: '',
        code: 0,
        failed: false,
        killed: true,
        signal: undefined,
        cmd: 'mock cmd',
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock-killed-linter' })
    await expect(taskFn()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"mock-killed-linter [KILLED]"`
    )
  })

  it('should not add TaskError if no error occur', async () => {
    expect.assertions(1)
    const context = getInitialState()
    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'jest', topLevelDir: '../' })
    await taskFn(context)
    expect(context.errors.has(TaskError)).toEqual(false)
  })

  it('should add TaskError on error', async () => {
    execa.mockReturnValueOnce(
      mockExecaReturnValue({
        stdout: 'Mock error',
        stderr: '',
        code: 0,
        failed: true,
        cmd: 'mock cmd',
      })
    )

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
    execa.mockReturnValueOnce(
      mockExecaReturnValue({
        stdout: '',
        stderr: '',
        code: 0,
        failed: false,
        killed: false,
        signal: undefined,
        cmd: 'mock cmd',
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd', verbose: true })
    const context = getInitialState()
    await expect(taskFn(context)).resolves.toMatchInlineSnapshot(`undefined`)

    expect(context.output).toEqual([])
  })

  it('should add output even when task succeeds if `verbose: true`', async () => {
    expect.assertions(2)
    execa.mockReturnValueOnce(
      mockExecaReturnValue({
        stdout: 'Mock success',
        stderr: '',
        code: 0,
        failed: false,
        killed: false,
        signal: undefined,
        cmd: 'mock cmd',
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd', verbose: true })
    const context = getInitialState()
    await expect(taskFn(context)).resolves.toMatchInlineSnapshot(`undefined`)

    expect(context.output).toMatchInlineSnapshot(`
      [
        "
      → mock cmd:
      Mock success",
      ]
    `)
  })

  it('should not add title to output when task errors while quiet', async () => {
    expect.assertions(2)
    execa.mockReturnValueOnce(
      mockExecaReturnValue({
        stdout: '',
        stderr: 'stderr',
        code: 1,
        failed: true,
        killed: false,
        signal: undefined,
        cmd: 'mock cmd',
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd' })
    const context = getInitialState({ quiet: true })
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(`"mock cmd [1]"`)

    expect(context.output).toMatchInlineSnapshot(`
      [
        "stderr",
      ]
    `)
  })

  it('should not print anything when task errors without output while quiet', async () => {
    expect.assertions(2)
    execa.mockReturnValueOnce(
      mockExecaReturnValue({
        stdout: '',
        stderr: '',
        code: 1,
        failed: true,
        killed: false,
        signal: undefined,
        cmd: 'mock cmd',
      })
    )

    const taskFn = resolveTaskFn({ ...defaultOpts, command: 'mock cmd' })
    const context = getInitialState({ quiet: true })
    await expect(taskFn(context)).rejects.toThrowErrorMatchingInlineSnapshot(`"mock cmd [1]"`)

    expect(context.output).toEqual([])
  })

  it('should not kill long running tasks without errors in context', async () => {
    execa.mockImplementationOnce(() =>
      mockExecaReturnValue(
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

    jest.runOnlyPendingTimers()

    await expect(taskPromise).resolves.toEqual()
  })

  it('should ignore pid-tree errors', async () => {
    execa.mockImplementationOnce(() =>
      mockExecaReturnValue(
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

    pidTree.mockImplementationOnce(() => {
      throw new Error('No matching pid found')
    })

    const context = getInitialState()
    const taskFn = resolveTaskFn({ command: 'node' })
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [KILLED]"`)
  })

  it('should kill a long running task when error event is emitted', async () => {
    execa.mockImplementationOnce(() =>
      mockExecaReturnValue(
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

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [KILLED]"`)
  })

  it('should also kill child processes of killed execa processes', async () => {
    expect.assertions(3)

    execa.mockImplementationOnce(() =>
      mockExecaReturnValue(
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

    const realKill = process.kill
    const mockKill = jest.fn()
    Object.defineProperty(process, 'kill', {
      value: mockKill,
    })

    pidTree.mockImplementationOnce(() => ['1234'])

    const taskFn = resolveTaskFn({ command: 'node' })

    const context = getInitialState()
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [KILLED]"`)

    expect(mockKill).toHaveBeenCalledTimes(1)
    expect(mockKill).toHaveBeenCalledWith('1234')

    Object.defineProperty(process, 'kill', {
      value: realKill,
    })
  })

  it('should ignore error when trying to kill child processes', async () => {
    expect.assertions(3)

    execa.mockImplementationOnce(() =>
      mockExecaReturnValue(
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

    const realKill = process.kill
    const mockKill = jest.fn(() => {
      throw new Error('kill ESRCH')
    })
    Object.defineProperty(process, 'kill', {
      value: mockKill,
    })

    pidTree.mockImplementationOnce(() => ['1234'])

    const taskFn = resolveTaskFn({ command: 'node' })

    const context = getInitialState()
    const taskPromise = taskFn(context)

    context.events.emit('lint-staged:taskError')

    jest.runAllTimers()

    await expect(taskPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"node [KILLED]"`)

    expect(mockKill).toHaveBeenCalledTimes(1)
    expect(mockKill).toHaveBeenCalledWith('1234')

    Object.defineProperty(process, 'kill', {
      value: realKill,
    })
  })
})
