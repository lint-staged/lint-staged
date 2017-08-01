'use strict'

const npmWhich = require('npm-which')(process.cwd())

module.exports = function findBin(cmdOrObject, packageJson, options) {
    /*
    * If package.json has script with cmd defined
    * we want it to be executed first
    */
    let isComplexCommand = false
    const cmd = typeof cmdOrObject === 'object' && !Array.isArray(cmdOrObject) && cmdOrObject !== null
         ? cmdOrObject.command
         : cmdOrObject

    if( cmd === undefined )
      throw new Error(`Command could not be found. You're package.json is probably wrong.`)

    if (packageJson.scripts && packageJson.scripts[cmd] !== undefined) {
        // Support for scripts from package.json
        const args = [
            'run',
            options && options.verbose ? undefined : '--silent',
            cmd
        ].filter(Boolean)

        return { bin: 'npm', args, isComplexCommand }
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

    const patternTemplate = /<((?:(?:[^<>]*[<>]?)(?:<full>|(?:<filename>|(?:<path>|(?:<extension>|<>))))(?:[^<>]*[<>]?))+)>(?: |$)/gi

    let parts = []

    if (! patternTemplate.test(cmd) ) {
      parts = cmd.split(' ')
    } else {
        isComplexCommand = true
        const regSplit = cmd.split(patternTemplate)
        parts = regSplit.shift().split(' ').filter( currentPart => currentPart !== '' )
        parts = parts.concat( regSplit.map(currentArg => currentArg.trim()) )
    }
    let bin = parts.shift()
    const args = parts

    try {
        /* npm-which tries to resolve the bin in local node_modules/.bin */
        /* and if this fails it look in $PATH */
        bin = npmWhich.sync(bin)

    } catch (err) {
        throw new Error(`${ bin } could not be found. Try \`npm install ${ bin }\`.`)
    }

    return { bin, args, isComplexCommand }
}
