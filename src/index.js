/* eslint no-console: 0 */
/* eslint no-process-exit: 0 */
/* eslint import/no-dynamic-require: 0 */

'use strict'

const appRoot = require('app-root-path')
const cosmiconfig = require('cosmiconfig')
const printErrors = require('./printErrors')
const runAll = require('./runAll')

// Find the right package.json at the root of the project
// TODO: Test if it should be aware of `gitDir`
const packageJson = require(appRoot.resolve('package.json'))

// Force colors for packages that depend on https://www.npmjs.com/package/supports-color
// but do this only in TTY mode
if (process.stdout.isTTY) {
  process.env.FORCE_COLOR = true
}

cosmiconfig('lint-staged', {
  rc: '.lintstagedrc',
  rcExtensions: true
})
  .then(result => {
    // result.config is the parsed configuration object
    // result.filepath is the path to the config file that was found
    runAll(packageJson, result.config)
      .then(() => {
        // No errors, exiting with 0
        process.exit(0)
      })
      .catch(error => {
        // Errors detected, printing and exiting with non-zero
        printErrors(error)
        process.exit(1)
      })
  })
  .catch(parsingError => {
    console.error(`Could not parse lint-staged config.
Make sure you have created it. See https://github.com/okonet/lint-staged#readme.

${parsingError}
`)
    process.exit(1)
  })
