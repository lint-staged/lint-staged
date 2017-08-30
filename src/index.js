/* eslint no-console: 0 */
/* eslint no-process-exit: 0 */

'use strict'

const appRoot = require('app-root-path')
const cosmiconfig = require('cosmiconfig')

const packageJson = require(appRoot.resolve('package.json')) // eslint-disable-line
const runAll = require('./runAll')

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
  })
  .catch(parsingError => {
    console.error(`Could not parse lint-staged config.
Make sure you have created it. See https://github.com/okonet/lint-staged#readme.

${parsingError}
`)
    process.exit(1)
  })
