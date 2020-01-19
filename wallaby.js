'use strict'

module.exports = wallaby => ({
  files: [
    { pattern: 'test/__fixtures__/*', instrument: false },
    'lib/*.js',
    'lib/__mocks__/*.js',
    '!test/*.spec.js'
  ],

  tests: ['test/*.spec.js'],

  env: {
    type: 'node',
    runner: 'node'
  },

  compilers: {
    '**/*.js': wallaby.compilers.babel()
  },

  testFramework: 'jest'
})
