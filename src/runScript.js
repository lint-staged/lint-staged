var findBin = require('./findBin');
var spawn = require('child_process').spawn;

module.exports = function runScript(linter, paths, cb) {
    findBin(linter, paths, function(err, binPath, args) {
        if (err) {
            console.error(err);
        }
        var npmStream = spawn(binPath, args, {
            stdio: 'inherit' // <== IMPORTANT: use this option to inherit the parent's environment
        });
        npmStream.on('error', function(error) {
            process.exitCode = 1;
            cb.call(this, error, null);
        });
        npmStream.on('close', function(code) {
            if (typeof cb === 'function') {
                cb.call(this, null, code);
            }
        });
        npmStream.on('exit', function(code) {
            process.exitCode = code;
        });
    });
};
