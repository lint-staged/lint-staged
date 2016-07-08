import expect from 'expect'
import mockSpawn from 'mock-spawn'
import rewire from 'rewire'
const runScript = rewire('../src/runScript')

const packageJSON = {
    scripts: {
        test: 'noop',
        test2: 'noop'
    },
    'lint-staged': {}
}

describe('runScript', () => {
    it('should run the callback with the proper exit code', done => {
        const spy = expect.createSpy()
        const mySpawn = mockSpawn()
        mySpawn.setDefault(mySpawn.simple(0))
        runScript.__set__('spawn', mySpawn)

        runScript('test', 'test.js', packageJSON, spy)
        setTimeout(() => {
            expect(mySpawn.calls.length).toEqual(1)
            expect(mySpawn.calls[0].exitCode).toEqual(0)
            expect(mySpawn.calls[0].command).toEqual('npm')
            expect(mySpawn.calls[0].args).toEqual(['run', '-s', 'test', '--', 'test.js'])

            expect(spy.calls.length).toEqual(1)
            expect(spy).toHaveBeenCalledWith(null, 0)
            done()
        }, 10)
    })

    it('should support array of scripts as a first argument', done => {
        const spy = expect.createSpy()
        const mySpawn = mockSpawn()
        mySpawn.sequence.add(mySpawn.simple(0))
        mySpawn.sequence.add(mySpawn.simple(1))
        runScript.__set__('spawn', mySpawn)

        runScript(['test', 'test2'], 'test.js', packageJSON, spy)
        setTimeout(() => {
            expect(mySpawn.calls.length).toEqual(2)
            expect(mySpawn.calls[0].exitCode).toEqual(0)
            expect(mySpawn.calls[0].command).toEqual('npm')
            expect(mySpawn.calls[0].args).toEqual(['run', '-s', 'test', '--', 'test.js'])

            expect(mySpawn.calls[1].exitCode).toEqual(1)
            expect(mySpawn.calls[1].command).toEqual('npm')
            expect(mySpawn.calls[1].args).toEqual(['run', '-s', 'test2', '--', 'test.js'])

            expect(spy.calls.length).toEqual(1)
            expect(spy).toHaveBeenCalledWith(null, 1)
            done()
        }, 10)
    })

    it('should stop the sequence execution if prev process finishes with non-zero', done => {
        const spy = expect.createSpy()
        const mySpawn = mockSpawn()
        mySpawn.sequence.add(mySpawn.simple(1))
        mySpawn.sequence.add(mySpawn.simple(0))
        runScript.__set__('spawn', mySpawn)

        runScript(['test', 'test2'], 'test.js', packageJSON, spy)
        setTimeout(() => {
            expect(mySpawn.calls.length).toEqual(1)
            expect(mySpawn.calls[0].exitCode).toEqual(1)

            expect(spy.calls.length).toEqual(1)
            expect(spy).toHaveBeenCalledWith(null, 1)
            done()
        }, 10)
    })

    it('should handle errors for single commands', done => {
        const err = new Error('linting error')
        const spy = expect.createSpy()
        const mySpawn = mockSpawn()
        mySpawn.sequence.add({throws: err})
        mySpawn.sequence.add(mySpawn.simple(0))
        runScript.__set__('spawn', mySpawn)

        runScript('test', 'test.js', packageJSON, spy)
        setTimeout(() => {
            expect(mySpawn.calls.length).toEqual(1)
            expect(spy.calls.length).toEqual(1)
            expect(spy.calls[0].arguments[0]).toBe(err)
            expect(spy.calls[0].arguments[1]).toNotEqual(0)
            done()
        }, 10)
    })

    it('should handle errors for sequences', done => {
        const err = new Error('linting error')
        const spy = expect.createSpy()
        const mySpawn = mockSpawn()
        mySpawn.sequence.add({throws: err})
        mySpawn.sequence.add(mySpawn.simple(0))
        runScript.__set__('spawn', mySpawn)

        runScript(['test', 'test2'], 'test.js', packageJSON, spy)
        setTimeout(() => {
            expect(mySpawn.calls.length).toEqual(1)
            expect(spy.calls.length).toEqual(1)
            expect(spy.calls[0].arguments[0]).toBe(err)
            expect(spy.calls[0].arguments[1]).toNotEqual(0)
            done()
        }, 10)
    })
})

