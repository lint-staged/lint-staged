var npmWhich = require('npm-which')(process.cwd())

module.exports = function findBin (binName, paths, config, cb) {
    var binPath = 'npm'
    var args = ['run', '-s', binName, '--'].concat(paths)
    /*
    * If package.json has script with binName defined
    * we want it to be executed first
    */
    if (config.scripts[binName] !== undefined) {
        // Support for scripts from package.json
        cb.call(this, null, binPath, args)
    } else {
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
        npmWhich(binName, function (err, bin) {
            if (err) {
                /*
                * If we could not locate a binary than the config is invald
                * and we should warn about it...
                */
                cb.call(this, err, null)
            }
            cb.call(this, null, bin, ['--'].concat(paths))
        })
    }
}
