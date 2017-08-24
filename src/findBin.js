'use strict'

const npmWhich = require('npm-which')(process.cwd())

module.exports = function findBin(cmd, packageJson, options) {
  /*
    * If package.json has script with cmd defined
    * we want it to be executed first
    */
  if (packageJson.scripts && packageJson.scripts[cmd] !== undefined) {
    // Support for scripts from package.json
    const args = ['run', options && options.verbose ? undefined : '--silent', cmd].filter(Boolean)

    return { bin: 'npm', args }
  }

  /*
    *  If cmd wasn't found in package.json scripts
    *  we'll try to locate the binary in node_modules/.bin
    *  and if this fails in $PATH.
    *
    *  This is useful for shorter configs like:
    *
    *  "lint-staged": {
    *    "*.js": "eslint"
    *  }
    *
    *  without adding
    *
    *  "scripts" {
    *    "eslint": "eslint"
    *  }
    */

  const parts = cmd.split(' ')
  let bin = parts[0]
  const args = parts.splice(1)

  try {
    /* npm-which tries to resolve the bin in local node_modules/.bin */
    /* and if this fails it look in $PATH */
    bin = npmWhich.sync(bin)
  } catch (err) {
    throw new Error(`${bin} could not be found. Try \`npm install ${bin}\`.`)
  }

  return { bin, args }
}
