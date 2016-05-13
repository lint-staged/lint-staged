var stagedFiles = require('staged-files');
var filter = require('gulp-filter');
var eslint = require('gulp-eslint');

var eslintFilter = filter('**/*.js', { restore: true });

stagedFiles()
    .pipe(eslintFilter)
    .pipe(eslint({
        useEslintrc: true
    }))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
