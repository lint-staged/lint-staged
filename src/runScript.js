var findBin = require('./findBin')
var spawn = require('child_process').spawn
var batch = require('batchflow')

module.exports = function runScript (linters, paths, config, cb) {
    var lintersArray = Array.isArray(linters) ? linters : [linters]
    var exitCode = 0
    batch(lintersArray)
        .series()
        .each(function (i, linter, next) {
            // If previous process finished with non-zero code
            // we'll stop executing the sequence
            if (exitCode > 0) {
                return next(exitCode)
            }

            findBin(linter, paths, config, function (err, binPath, args) {
                if (err) {
                    throw err
                }
                var npmStream = spawn(binPath, args, {
                    stdio: 'inherit' // <== IMPORTANT: use this option to inherit the parent's environment
                })
                npmStream.on('exit', function (code) {
                    exitCode = code
                })
                npmStream.on('close', next)
            })
        })
        .error(function (err) {
            console.error(err)
            cb.call(this, err, null)
        })
        .end(function () {
            process.exitCode = exitCode
            if (typeof cb === 'function') {
                cb.call(this, null, exitCode)
            }
        })
}
