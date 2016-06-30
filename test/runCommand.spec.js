import rewire from 'rewire'
import test from 'ava';
import fs from 'fs';
import { Writable } from 'stream'
var runCommand = rewire('../src/runCommand');

var npmWichMock = function(path, cb) {
    return cb(null, path);
};

var cpMock = {
    spawn: function(path, args, options) {
        // const stream = new Writable()
        // console.log(stream)
        return new Writable()
    }
};

runCommand.__set__("npmWhich", npmWichMock)
runCommand.__set__("cp", cpMock)

test.cb('should work', t => {
    runCommand('eslint', (err, path) => {
        t.is(path, 'eslint')
        t.end()
    });
});
