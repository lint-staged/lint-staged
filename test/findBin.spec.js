import rewire from 'rewire';
import test from 'ava';
var findBin = rewire('../src/findBin');

test.cb('should return bin from node_modules/.bin', t => {
    var npmWichMock = function(path, cb) {
        cb(null, path);
    };

    findBin.__set__('npmWhich', npmWichMock);

    findBin('eslint', 'test.js test2.js', (err, bin, args) => {
        t.is(bin, 'eslint');
        t.deepEqual(args, ['--', 'test.js test2.js']);
        t.end();
    });
});

test.cb('should return npm run command', t => {
    var npmWichMock = function(path, cb) {
        cb(new Error(), null);
    };

    findBin.__set__('npmWhich', npmWichMock);

    findBin('eslint', 'test.js', (err, bin, args) => {
        t.is(bin, 'npm');
        t.deepEqual(args, ['run', '-s', 'eslint', '--', 'test.js']);
        t.end();
    });
});

