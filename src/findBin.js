'use strict'

const npmWhich = require('npm-which')(process.cwd())

module.exports = function findBin (binName, paths, config) {
    const bin = 'npm'
    const files = ['--color', '--'].concat(paths)
    const args = ['run', '-s', binName].concat(files)
    /*
    * If package.json has script with binName defined
    * we want it to be executed first
    */
    if (config.scripts[binName] !== undefined) {
        // Support for scripts from package.json
        return {
            bin,
            args
        }
    }

    /*
    *  If binName wasn't found in package.json scripts
    *  we'll try to locate the binary in node_modules/.bin
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
    return {
        bin: npmWhich.sync(binName),
        args: files
    }
}
