module.exports = function (wallaby) {
    return {
        files: [
            { pattern: 'test/__fixtures__/*', instrument: false },
            { pattern: 'test/__fixtures__/**/*', instrument: false },
            { pattern: 'test-setup.js', instrument: false },
            'test/utils.js',
            'src/*.js'
        ],

        tests: [
            'test/*.spec.js'
        ],

        env: {
            type: 'node'
        },

        compilers: {
            '**/*.js': wallaby.compilers.babel()
        },

        testFramework: 'mocha',

        setup: () => {
            require('babel-polyfill') // eslint-disable-line
        }
    }
}
