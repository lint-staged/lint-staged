/* eslint no-console: 0 */

import stripColors from 'strip-ansi'
import runAll from '../src/runAll'

let stdout = ''
console.log = jest.fn((input) => {
    // eslint-disable-next-line prefer-template
    stdout += JSON.stringify(stripColors(input)).replace(/\[\d\d:\d\d:\d\d\]\W/, '') + '\n'
    return stdout
})

const packageJson = {
    scripts: {
        mytask: 'echo "Running task"'
    }
}

describe('runAll', () => {
    beforeEach(() => {
        stdout = ''
    })

    it('should skip all tasks if there are no staged files', (done) => {
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

    it('should run tasks on staged files', (done) => {
        const config = {
            '*': 'mytask'
        }

        runAll(packageJson, config).then(() => {
            expect(stdout).toMatchSnapshot()
            done()
        })
    })
})
