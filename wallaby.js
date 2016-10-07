module.exports = function (wallaby) {
    return {
        files: [
            { pattern: 'test/__fixtures__/*', instrument: false },
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

        testFramework: 'mocha'
    }
}
