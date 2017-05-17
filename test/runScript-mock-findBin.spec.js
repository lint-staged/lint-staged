// This is in a separate test file because I was unable to get `jest.mock` working in a test block
// `jest.mock` gets hoisted, but even with `jest.doMock` it wasn't working
/* eslint no-underscore-dangle: 0 */

import expect from 'expect'
import isPromise from 'is-promise'
import mockFn from 'execa'
import runScript from '../src/runScript'

jest.mock('execa')

// Mock findBin to return an absolute path
jest.mock('../src/findBin', () => (commands, paths) => {
    const [
      bin,
      ...otherArgs
    ] = commands.split(' ')

    return ({
        bin: `/usr/local/bin/${ bin }`,
        args: otherArgs.concat(['--']).concat(paths)
    })
}, { virtual: true })

expect.extend({
    toBeAPromise() {
        expect.assert(
            isPromise(this.actual),
            'expected %s to be a Promise',
            this.actual
        )
        return this
    }
})

const packageJSON = {
    scripts: {
        test: 'noop',
        test2: 'noop'
    },
    'lint-staged': {}
}

describe.only('runScript with absolute paths', () => {
    beforeEach(() => {
        mockFn.mockReset()
        mockFn.mockImplementation(() => new Promise(() => {}))
    })

    it('can pass `gitDir` as `cwd` to `execa()` when git is called via absolute path', () => {
        const res = runScript(
          ['git add'],
          'test.js',
          packageJSON,
          { gitDir: '../' }
        )

        expect(res[0].task()).toBeAPromise()
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0][0]).toMatch('/usr/local/bin/git')
        expect(mockFn.mock.calls[0][1]).toEqual(['add', '--', 'test.js'])
        expect(mockFn.mock.calls[0][2]).toEqual({ cwd: '../' })
    })
})

