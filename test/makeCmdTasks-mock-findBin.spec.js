// This is in a separate test file because I was unable to get `jest.mock` working in a test block
// `jest.mock` gets hoisted, but even with `jest.doMock` it wasn't working

import mockFn from 'execa'
import makeCmdTasks from '../src/makeCmdTasks'

jest.mock('../src/resolveGitDir', () => () => '../')

// Mock findBin to return an absolute path
jest.mock('../src/findBin', () => commands => {
  const [bin, ...otherArgs] = commands.split(' ')

  return {
    bin: `/usr/local/bin/${bin}`,
    args: otherArgs
  }
})

describe('makeCmdTasks with absolute paths', () => {
  afterEach(() => {
    mockFn.mockClear()
  })

  it('passes `gitDir` as `cwd` to `execa()` when git is called via absolute path', async () => {
    expect.assertions(2)
    const [linter] = makeCmdTasks(['git add'], ['test.js'])
    await linter.task()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('/usr/local/bin/git', ['add', 'test.js'], {
      cwd: '../',
      reject: false
    })
  })
})
