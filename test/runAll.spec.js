/* eslint no-console: 0 */

import stripColors from 'strip-ansi'
import runAll from '../src/runAll'

describe('runAll', () => {
    it('should work', async () => {
        const config = {
            verbose: true,
            linters: {
                '*': 'eslint'
            }
        }
        let stdout = []
        console.log = jest.fn()
            .mockImplementation(input => stdout.push(JSON.stringify(stripColors(input))))
        await runAll({}, config)
        stdout = stdout.map(line => line && line.replace(/\[\d\d:\d\d:\d\d\]\W/, ''))
        expect(stdout).toMatchSnapshot()
    })
})
