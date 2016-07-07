var findBin = require('./findBin')
var spawn = require('child_process').spawn
var batch = require('batchflow')

module.exports = function runScript (linters, paths, config, cb) {
    var lintersArray = Array.isArray(linters) ? linters : [linters]
    batch(lintersArray)
        .sequential()
        .each(function (i, linter, next) {
            findBin(linter, paths, config, function (err, binPath, args) {
                if (err) {
                    throw new Error(err)
                }
                var npmStream = spawn(binPath, args, {
                    stdio: 'inherit' // <== IMPORTANT: use this option to inherit the parent's environment
                })
                npmStream.on('error', function (error) {
                    // process.exitCode = 1;
                    throw new Error(error)
                })
                npmStream.on('exit', function (code) {
                    process.exitCode = code
                })
                npmStream.on('close', function (code) {
                    next(code)
                })
            })
        })
        .error(function (err) {
            console.error(err)
            cb.call(this, err, null)
        })
        .end(function (codes) {
            var exitCode = codes.length ? Math.max.apply(this, codes) : 0
            if (typeof cb === 'function') {
                cb.call(this, null, exitCode)
            }
        })
}
