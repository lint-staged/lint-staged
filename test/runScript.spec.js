/* eslint no-underscore-dangle: 0 */

import expect from 'expect'
import isPromise from 'is-promise'
import rewire from 'rewire'

const runScript = rewire('../src/runScript')

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
    afterEach(() => {
        expect.restoreSpies()
    })

    it('should return an array', () => {
        expect(runScript('test', 'test.js', packageJSON)).toBeA('array')
    })

    it('should throw for non-existend script', () => {
        expect(runScript('test3', 'test.js', packageJSON)[0].task).toThrow()
    })

    it('should work with a single command', () => {
        const res = runScript('test', 'test.js', packageJSON)
        expect(res.length).toBe(1)
        expect(res[0].title).toBe('test')
        expect(res[0].task).toBeA('function')
        expect(res[0].task()).toBeAPromise()
    })

    it('should support array of scripts as a first argument', () => {
        const spy = expect.createSpy()
        runScript.__set__('execa', spy)
        const res = runScript(['test', 'test2'], 'test.js', packageJSON)
        expect(res.length).toBe(2)
        expect(res[0].title).toBe('test')
        expect(res[1].title).toBe('test2')

        expect(res[0].task()).toBeAPromise()
        expect(spy.calls.length).toEqual(1)
        expect(spy.calls[0].arguments).toEqual(
            ['npm', ['run', '--silent', 'test', '--', 'test.js'], {}]
        )

        expect(res[1].task()).toBeAPromise()
        expect(spy.calls.length).toEqual(2)
        expect(spy.calls[1].arguments).toEqual(
            ['npm', ['run', '--silent', 'test2', '--', 'test.js'], {}]
        )
    })

    it('should support non npm scripts', () => {
        const spy = expect.createSpy()
        runScript.__set__('execa', spy)
        const res = runScript(['node --arg=true ./myscript.js', 'git add'], 'test.js', packageJSON)
        expect(res.length).toBe(2)
        expect(res[0].title).toBe('node --arg=true ./myscript.js')
        expect(res[1].title).toBe('git add')

        expect(res[0].task()).toBeAPromise()
        expect(spy.calls.length).toEqual(1)
        expect(spy.calls[0].arguments[0]).toContain('node')
        expect(spy.calls[0].arguments[1]).toEqual(['--arg=true', './myscript.js', '--', 'test.js'])

        expect(res[1].task()).toBeAPromise()
        expect(spy.calls.length).toEqual(2)
        expect(spy.calls[1].arguments[0]).toContain('git')
        expect(spy.calls[1].arguments[1]).toEqual(['add', '--', 'test.js'])
    })

    it('should pass cwd to execa if gitDir option is set for non-npm tasks', () => {
        const spy = expect.createSpy()
        runScript.__set__('execa', spy)
        const res = runScript(
            ['test', 'git add'],
            'test.js',
            packageJSON,
            { gitDir: '../' }
        )
        expect(res[0].task()).toBeAPromise()
        expect(spy.calls.length).toEqual(1)
        expect(spy.calls[0].arguments).toEqual(
            ['npm', ['run', '--silent', 'test', '--', 'test.js'], {}]
        )

        expect(res[1].task()).toBeAPromise()
        expect(spy.calls.length).toEqual(2)
        expect(spy.calls[1].arguments[0]).toMatch(/git$/)
        expect(spy.calls[1].arguments[1]).toEqual(['add', '--', 'test.js'])
        expect(spy.calls[1].arguments[2]).toEqual({ cwd: '../' })
    })

    it('should use --silent in non-verbose mode', () => {
        const spy = expect.createSpy()
        runScript.__set__('execa', spy)
        const res = runScript(
            'test',
            'test.js',
            packageJSON,
            { verbose: false }
        )
        expect(res[0].task()).toBeAPromise()
        expect(spy.calls.length).toEqual(1)
        expect(spy.calls[0].arguments).toEqual(
            ['npm', ['run', '--silent', 'test', '--', 'test.js'], {}]
        )
    })

    it('should not use --silent in verbose mode', () => {
        const spy = expect.createSpy()
        runScript.__set__('execa', spy)
        const res = runScript(
            'test',
            'test.js',
            packageJSON,
            { verbose: true }
        )
        expect(res[0].task()).toBeAPromise()
        expect(spy.calls.length).toEqual(1)
        expect(spy.calls[0].arguments).toEqual(
            ['npm', ['run', 'test', '--', 'test.js'], {}]
        )
    })
})

