/* eslint no-console: 0 */

import sgfMock from 'staged-git-files'
import { getConfig } from '../src/config-util'
import runAll from '../src/runAll'

jest.mock('staged-git-files')

sgfMock.mockImplementation((params, callback) => {
  callback(null, [])
})

const packageJson = {
  scripts: {
    mytask: 'echo "Running task"'
  }
}

describe('runAll', () => {
  afterEach(() => {
    sgfMock.mockClear()
  })
  it('should throw when invalid config is provided', () => {
    expect(() => runAll(packageJson, {})).toThrowErrorMatchingSnapshot()
    expect(() => runAll(packageJson)).toThrowErrorMatchingSnapshot()
  })

  it('should not throw when a valid config is provided', () => {
    const config = getConfig({
      concurrent: false
    })
    expect(() => runAll(packageJson, config)).not.toThrow()
  })

  it('should return a promise', () => {
    expect(runAll(packageJson, getConfig({}))).toBeInstanceOf(Promise)
  })

  it('should resolve the promise with no tasks', () => {
    expect.assertions(1)
    return expect(runAll(packageJson, getConfig({}))).resolves.toEqual('No tasks to run.')
  })

  it('should reject the promise when staged-git-files errors', () => {
    sgfMock.mockImplementation((params, callback) => {
      callback('test', undefined)
    })
    expect.assertions(1)
    return expect(runAll(packageJson, getConfig({}))).rejects.toEqual('test')
  })
})
