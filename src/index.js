var spawn = require('child_process').spawn;
var stagedFiles = require('staged-files');
var minimatch = require('minimatch');

var files = [];
var linters = {
    'eslint': '**/*.js',
    'stylelint': '**/*.scss'
};
var stream = stagedFiles(null, ['--diff-filter=ACM']);

function runLinter(linter, paths) {
    var args = ['run', '-s', linter + '-staged', '--'].concat(paths);
    var npmStream = spawn('npm', args, {
        stdio: 'inherit' // <== IMPORTANT: use this option to inherit the parent's environment
    });
    npmStream.on('error', function(error) {
        console.log('error', error);
    });
    npmStream.on('close', function(code) {
        process.exitCode = code;
    });
}

stream.on('data', function(data) {
    files.push(data);
});

stream.on('end', function() {
    var paths = files.map(function(file) {
        return file.path;
    });
    console.log('Found %s staged files', paths.length);
    if (paths.length) {
        console.log('Running linters...');
        Object.keys(linters).forEach(function(linter) {
            var fileList = paths.filter(minimatch.filter(linters[linter], { matchBase: true }));
            if (fileList.length) {
                console.log('Running %s on %s', linter, fileList);
                runLinter(linter, fileList);
            }
        });
    }
});

