var npmWhich = require('npm-which')(process.cwd());

module.exports = function findBin(binName, paths, cb) {
    npmWhich(binName, function(err, binPath) {
        var args = ['--'].concat(paths);
        if (err) {
            // Support for scripts from package.json
            binPath = 'npm'; // eslint-disable-line
            args = ['run', '-s', binName, '--'].concat(paths);
        }
        cb.call(this, null, binPath, args);
    });
};
