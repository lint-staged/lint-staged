var cp = require('child_process');
var npmWhich = require('npm-which')(process.cwd());

module.exports = function runLinter(linter, paths, cb) {
    npmWhich(linter, function(err, binPath) {
        var args = ['--'].concat(paths);
        if (err) {
            // Support for scripts from package.json
            binPath = 'npm'; // eslint-disable-line
            args = ['run', '-s', linter, '--'].concat(paths);
        }
        var npmStream = cp.spawn(binPath, args, {
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
}
