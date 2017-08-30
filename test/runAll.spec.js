/* eslint no-console: 0 */

import stripColors from 'strip-ansi'
import runAll from '../src/runAll'

let stdout = ''
console.log = jest.fn(input => {
  // eslint-disable-next-line prefer-template
  stdout += stripColors(input).replace(/\[\d\d:\d\d:\d\d\]\W/, '') + '\n'
  return stdout
})

const packageJson = {
  scripts: {
    mytask: 'echo "Running task"'
  }
}

describe('runAll', () => {
  beforeEach(() => {
    process.stdout.isTTY = false // Overwrite TTY mode in order for Listr to use verbose renderer
    stdout = ''
  })

  it('should ouput config in verbose mode', done => {
    const config = {
      verbose: true,
      linters: {
        '*': 'mytask'
      }
    }

    runAll(packageJson, config).then(() => {
      expect(stdout).toMatchSnapshot()
      done()
    })
  })

  it('should not output config in non verbose mode', done => {
    const config = {
      '*': 'mytask'
    }

    runAll(packageJson, config).then(() => {
      expect(stdout).toMatchSnapshot()
      done()
    })
  })
})
