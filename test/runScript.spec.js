/* eslint no-underscore-dangle: 0 */

import expect from 'expect'
import isPromise from 'is-promise'
import mockFn from 'execa'
import runScript from '../src/runScript'

jest.mock('execa')

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

describe('runScript', () => {

    beforeEach(() => {
        mockFn.mockReset()
        mockFn.mockImplementation(() => Promise.resolve(true))
    })

    it('should return an array', () => {
        expect(runScript('test', ['test.js'], packageJSON)).toBeA('array')
    })

    it('should throw for non-existend script', () => {
        expect(() => {
            runScript('missing-module', ['test.js'], packageJSON)[0].task()
        }).toThrow()
    })

    it('should work with a single command', async () => {
        const res = runScript('test', ['test.js'], packageJSON)
        expect(res.length).toBe(1)
        expect(res[0].title).toBe('test')
        expect(res[0].task).toBeA('function')
        const taskPromise = res[0].task()
        expect(taskPromise).toBeAPromise()
        await taskPromise
    })

    it('should work with multiple commands', async () => {
        const res = runScript(['test', 'test2'], ['test.js'], packageJSON)
        expect(res.length).toBe(2)
        expect(res[0].title).toBe('test')
        expect(res[1].title).toBe('test2')

        let taskPromise = res[0].task()
        expect(taskPromise).toBeAPromise()
        await taskPromise
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0]).toEqual(
            ['npm', ['run', '--silent', 'test', '--', 'test.js'], {}]
        )
        taskPromise = res[1].task()
        expect(taskPromise).toBeAPromise()
        await taskPromise
        expect(mockFn.mock.calls.length).toEqual(2)
        expect(mockFn.mock.calls[1]).toEqual(
            ['npm', ['run', '--silent', 'test2', '--', 'test.js'], {}]
        )
    })

    it('should respect chunk size', async () => {
        const res = runScript(
            ['test'],
            ['test1.js', 'test2.js'],
            packageJSON,
            { config: { chunkSize: 1 } }
        )
        const taskPromise = res[0].task()
        expect(taskPromise).toBeAPromise()
        await taskPromise
        expect(mockFn.mock.calls.length).toEqual(2)
        expect(mockFn.mock.calls[0]).toEqual(
            ['npm', ['run', '--silent', 'test', '--', 'test1.js'], {}]
        )
        expect(mockFn.mock.calls[1]).toEqual(
            ['npm', ['run', '--silent', 'test', '--', 'test2.js'], {}]
        )
    })

    it('should support non npm scripts', async () => {
        const res = runScript(['node --arg=true ./myscript.js', 'git add'], ['test.js'], packageJSON)
        expect(res.length).toBe(2)
        expect(res[0].title).toBe('node --arg=true ./myscript.js')
        expect(res[1].title).toBe('git add')

        let taskPromise = res[0].task()
        expect(taskPromise).toBeAPromise()
        await taskPromise
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0][0]).toContain('node')
        expect(mockFn.mock.calls[0][1]).toEqual(['--arg=true', './myscript.js', 'test.js'])

        taskPromise = res[1].task()
        expect(taskPromise).toBeAPromise()
        await taskPromise
        expect(mockFn.mock.calls.length).toEqual(2)
        expect(mockFn.mock.calls[1][0]).toContain('git')
        expect(mockFn.mock.calls[1][1]).toEqual(['add', 'test.js'])
    })

    it('should pass cwd to execa if gitDir option is set for non-npm tasks', async () => {
        const res = runScript(
            ['test', 'git add'],
            ['test.js'],
            packageJSON,
            { gitDir: '../' }
        )
        let taskPromise = res[0].task()
        expect(taskPromise).toBeAPromise()
        await taskPromise
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0]).toEqual(
            ['npm', ['run', '--silent', 'test', '--', 'test.js'], {}]
        )

        taskPromise = res[1].task()
        expect(taskPromise).toBeAPromise()
        await taskPromise
        expect(mockFn.mock.calls.length).toEqual(2)
        expect(mockFn.mock.calls[1][0]).toMatch(/git$/)
        expect(mockFn.mock.calls[1][1]).toEqual(['add', 'test.js'])
        expect(mockFn.mock.calls[1][2]).toEqual({ cwd: '../' })
    })

    it('should not pass `gitDir` as `cwd` to `execa()` if a non-git binary is called', async () => {
        const res = runScript(
          ['jest'],
          ['test.js'],
          packageJSON,
          { gitDir: '../' }
        )
        const taskPromise = res[0].task()
        expect(taskPromise).toBeAPromise()
        await taskPromise
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0]).toEqual(
          ['jest', ['test.js'], {}]
        )
    })

    it('should use --silent in non-verbose mode', async () => {
        const res = runScript(
            'test',
            ['test.js'],
            packageJSON,
            { verbose: false }
        )
        const taskPromise = res[0].task()
        expect(taskPromise).toBeAPromise()
        await taskPromise
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0]).toEqual(
            ['npm', ['run', '--silent', 'test', '--', 'test.js'], {}]
        )
    })

    it('should not use --silent in verbose mode', async () => {
        const res = runScript(
            'test',
            ['test.js'],
            packageJSON,
            { verbose: true }
        )
        const taskPromise = res[0].task()
        expect(taskPromise).toBeAPromise()
        await taskPromise
        expect(mockFn.mock.calls.length).toEqual(1)
        expect(mockFn.mock.calls[0]).toEqual(
            ['npm', ['run', 'test', '--', 'test.js'], {}]
        )
    })

    it('should throw error for failed linters', async () => {
        const linteErr = new Error()
        linteErr.stdout = 'Mock error'
        linteErr.stderr = ''
        mockFn.mockImplementation(() => Promise.reject(linteErr))

        const res = runScript('mock-fail-linter', ['test.js'], packageJSON)
        const taskPromise = res[0].task()
        try {
            await taskPromise
        } catch (err) {
            expect(err.message).toMatch(`🚫 mock-fail-linter found some errors. Please fix them and try committing again.
${ linteErr.stdout }
${ linteErr.stderr }`)
        }
    })
})
