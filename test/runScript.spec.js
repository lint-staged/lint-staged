import expect from 'expect';
import mockSpawn from 'mock-spawn';
import rewire from 'rewire';
const runScript = rewire('../src/runScript');

var mySpawn = mockSpawn();
require('child_process').spawn = mySpawn;
mySpawn.setDefault(mySpawn.simple(1 /* exit code */, 'hello world' /* stdout */));

const packageJSON = {
    scripts: {
        test: 'noop'
    },
    'lint-staged': {}
};

describe('runScript', () => {
    it.skip('should run the callback with the proper exit code', done => {
        const spy = expect.createSpy();
        const findBinSpy = expect.createSpy(runScript.__get__('findBin')).andCallThrough();
        runScript.__set__('findBin', findBinSpy);
        runScript('test', 'test.js', packageJSON, spy);
        setTimeout(() => {
            expect(findBinSpy.calls.length).toEqual(1);
            expect(spy.calls.length).toEqual(1);
            expect(findBinSpy.calls[0].arguments[0]).toEqual('test');
            expect(findBinSpy.calls[0].arguments[1]).toEqual('test.js');
            expect(spy).toHaveBeenCalledWith(null, 1);
            done();
        }, 0);
    });

    it.skip('should support array of scripts as a first argument', done => {
        const spy = expect.createSpy();
        const findBinSpy = expect.createSpy(runScript.__get__('findBin')).andCallThrough();
        runScript.__set__('findBin', findBinSpy);
        runScript(['test', 'test2'], 'test.js', packageJSON, spy);
        setTimeout(() => {
            expect(findBinSpy.calls.length).toEqual(2);

            expect(findBinSpy.calls[0].arguments[0]).toEqual('test');
            expect(findBinSpy.calls[0].arguments[1]).toEqual('test.js');

            expect(findBinSpy.calls[1].arguments[0]).toEqual('test2');
            expect(findBinSpy.calls[1].arguments[1]).toEqual('test.js');

            expect(spy.calls.length).toEqual(1);
            expect(spy).toHaveBeenCalledWith(null, 1);
            done();
        }, 0);
    });
});


