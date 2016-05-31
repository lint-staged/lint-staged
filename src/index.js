var stagedFiles = require('staged-files');
var shell = require('gulp-shell');
var filter = require('gulp-filter');
var eslintFilter = filter('**/*.js', { restore: true });

stagedFiles()
    .pipe(eslintFilter)
    .pipe(shell([
        'echo Linting <%= file.path %>...',
        'npm run --loglevel=silent eslint -- <%= file.path %> --color'
    ]));
