module.exports = function (wallaby) {
    return {
        files: [
            { pattern: 'test/__fixtures__/*', instrument: false },
            { pattern: 'test/__fixtures__/**/*', instrument: false },
            { pattern: 'test-setup.js', instrument: false },
            'src/*.js',
            'test/**/*.js',
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
