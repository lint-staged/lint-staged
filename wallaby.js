module.exports = function (wallaby) {
    return {
        files: [
            { pattern: 'test/__fixtures__/*', instrument: false },
            { pattern: 'test/__fixtures__/**/*', instrument: false },
            { pattern: 'test-setup.js', instrument: false },
            'test/utils.js',
            'src/*.js',
            'src/__mocks__/*.js',
            '!test/*.spec.js'
        ],

        tests: [
            'test/*.spec.js'
        ],

        env: {
            type: 'node',
            runner: 'node'
        },

        compilers: {
            '**/*.js': wallaby.compilers.babel()
        },

        testFramework: 'jest'
    }
}
