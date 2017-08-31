/* eslint no-console: 0 */

import runAll from '../src/runAll'

const packageJson = {
  scripts: {
    mytask: 'echo "Running task"'
  }
}

describe('runAll', () => {
  it('should return a promise', () => {
    expect(runAll(packageJson, {})).toBeInstanceOf(Promise)
  })

  it('should resolve the promise with no tasks', () => {
    expect.assertions(1)
    return expect(runAll(packageJson, {})).resolves.toEqual('No tasks to run.')
  })
})
