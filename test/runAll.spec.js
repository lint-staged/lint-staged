/* eslint no-console: 0 */

import { getConfig } from '../src/getConfig'
import runAll from '../src/runAll'

const packageJson = {
  scripts: {
    mytask: 'echo "Running task"'
  }
}

describe('runAll', () => {
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
})
