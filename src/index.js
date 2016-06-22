var cp = require('child_process');
var sgf = require('staged-git-files');
var minimatch = require('minimatch');
var ora = require('ora');
var npmWhich = require('npm-which')(process.cwd());
var assign = require('object-assign');

var appRoot = require('app-root-path');
var config = require(appRoot.resolve('package.json'));
var defaultLinters = {};
var customLinters = config['lint-staged'];
var linters = assign(defaultLinters, customLinters);
var spinner = ora('Starting lint-staged').start();

function runLinter(linter, paths, cb) {
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

sgf('ACM', function(err, results) {
    if (err) {
        console.error(err);
    }
    var filePaths = results.map(function(file) {
        return file.filename;
    });
    if (filePaths.length) {
        Object.keys(linters).forEach(function(linter) {
            var extensions = linters[linter];
            var fileList = filePaths.filter(minimatch.filter(extensions, { matchBase: true }));
            if (fileList.length) {
                spinner.text = 'Running ' + linter + '...';
                runLinter(linter, fileList, function(error, exitCode) {
                    if (error) {
                        console.error(error);
                    }
                    if (exitCode > 0) {
                        console.log('Linter %s exited with code %s', linter, exitCode);
                    }
                    spinner.stop();
                    spinner.clear();
                });
            } else {
                spinner.stop();
            }
        });
    } else {
        spinner.stop();
        console.log('No staged files found...');
    }
});

