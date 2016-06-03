var spawn = require('child_process').spawn;
var sgf = require('staged-git-files');
var minimatch = require('minimatch');
var ora = require('ora');

var linters = {
    'eslint': '**/*.js',
    'stylelint': '**/*.scss'
};

var spinner = ora('Starting lint-staged').start();

function runLinter(linter, paths) {
    var args = ['run', '-s', linter + '-staged', '--'].concat(paths);
    var npmStream = spawn('npm', args, {
        stdio: 'inherit' // <== IMPORTANT: use this option to inherit the parent's environment
    });
    npmStream.on('error', function(error) {
        console.log('error', error);
    });
    npmStream.on('close', function(code) {
        spinner.stop();
        process.exitCode = code;
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
            var fileList = filePaths.filter(minimatch.filter(linters[linter], { matchBase: true }));
            if (fileList.length) {
                spinner.text = 'Running ' + linter + ' on ' + fileList;
                runLinter(linter, fileList);
            }
        });
    }
});

