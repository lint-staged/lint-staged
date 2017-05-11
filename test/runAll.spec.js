/* eslint no-console: 0 */

import stripColors from 'strip-ansi'
import runAll from '../src/runAll'

let stdout = []
console.log = jest.fn((input) => {
    stdout.push(JSON.stringify(stripColors(input)).replace(/\[\d\d:\d\d:\d\d\]\W/, ''))
    return stdout.join('\n')
})

const packageJson = {
    scripts: {
        mytask: 'echo "Running task"'
    }
}

describe('runAll', () => {
    beforeEach(() => {
        stdout = []
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
