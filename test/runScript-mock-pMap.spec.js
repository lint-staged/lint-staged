import expect from 'expect'
import pMap from 'p-map'
import runScript from '../src/runScript'

jest.mock('p-map', () => jest.fn(() => Promise.resolve(true)))

const packageJSON = {
    scripts: {
        test: 'noop',
        test2: 'noop'
    },
    'lint-staged': {}
}

describe('runScript', () => {

    it('should respect concurrency', () => {
        const res = runScript(
            ['test'],
            ['test1.js', 'test2.js'],
            packageJSON,
            { config: { chunkSize: 1, subTaskConcurrency: 1 } }
        )
        res[0].task()
        expect(pMap.mock.calls.length).toEqual(1)
        const pMapArgs = pMap.mock.calls[0]
        expect(pMapArgs[0]).toEqual([['test1.js'], ['test2.js']])
        expect(pMapArgs[1]).toBeA('function')
        expect(pMapArgs[2]).toEqual({ concurrency: 1 })
    })

    it('should handle unexpected error', async () => {
        pMap.mockImplementation(() => Promise.reject(new Error('Unexpected Error')))

        const res = runScript(
            ['test'],
            ['test.js'],
            packageJSON
        )
        try {
            await res[0].task()
        } catch (err) {
            expect(err.message).toMatch(`🚫 test got an unexpected error.
Unexpected Error`)
        }
    })

})
