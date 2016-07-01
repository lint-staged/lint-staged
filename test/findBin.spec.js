import rewire from 'rewire';
import test from 'ava';
const findBin = rewire('../src/findBin');
const packageJSON = {
    scripts: {
        test: 'noop'
    },
    'lint-staged': {}
};
const npmWichMockGood = (path, cb) => {
    cb(null, path);
};
const npmWichMockBad = (path, cb) => {
    cb(true, null);
};

test.cb('should return npm run command if it exist in both package.json and .bin/', t => {
    const packageJSONMock = {
        scripts: {
            eslint: 'eslint'
        }
    };

    findBin.__set__('npmWhich', npmWichMockGood);
    findBin('eslint', 'test.js', packageJSONMock, (err, bin, args) => {
        t.is(bin, 'npm');
        t.deepEqual(args, ['run', '-s', 'eslint', '--', 'test.js']);
        t.end();
    });
});

test.cb('should return bin from node_modules/.bin if there is no command in package.json', t => {
    findBin.__set__('npmWhich', npmWichMockGood);
    findBin('eslint', 'test.js test2.js', packageJSON, (err, bin, args) => {
        t.is(bin, 'eslint');
        t.deepEqual(args, ['--', 'test.js test2.js']);
        t.end();
    });
});

test('should return error if bin not found and there is no entry in scripts section', t => {
    findBin.__set__('npmWhich', npmWichMockBad);
    t.throws(() => {
        findBin('eslint', 'test.js', packageJSON, (err) => {
            throw new Error(err);
        });
    });
});
