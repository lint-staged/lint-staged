'use strict'

const npmWhich = require('npm-which')(process.cwd())
const which = require('which')

module.exports = function findBin(cmd, paths, packageJson) {
    const defaultArgs = ['--'].concat(paths)
    /*
    * If package.json has script with cmd defined
    * we want it to be executed first
    */
    if (packageJson.scripts && packageJson.scripts[cmd] !== undefined) {
        // Support for scripts from package.json
        return {
            bin: 'npm',
            args: ['run', '--silent', cmd].concat(defaultArgs)
        }
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
        /* Firstly, try to resolve the bin in local node_modules/.bin */
        bin = npmWhich.sync(bin)
    } catch (err) {
        /* If this fails, try to resolve binary in $PATH */
        try {
            bin = which.sync(bin)
        } catch (error) {
            throw new Error(`${ bin } could not be found. Try \`npm install ${ bin }\`.`)
        }
    }

    return {
        bin,
        args: args.concat(defaultArgs)
    }
}
