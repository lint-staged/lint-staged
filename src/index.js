var cp = require('child_process');
var sgf = require('staged-git-files');
var minimatch = require('minimatch');
var ora = require('ora');
var npmWhich = require('npm-which')(process.cwd());
var assign = require('object-assign');
var runCommand = require('./runCommand')

var appRoot = require('app-root-path');
var config = require(appRoot.resolve('package.json'));
var defaultLinters = {};
var customLinters = config['lint-staged'];
var linters = assign(defaultLinters, customLinters);
var spinner = ora('Starting lint-staged').start();

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
                runCommand(linter, fileList, function(error, exitCode) {
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

