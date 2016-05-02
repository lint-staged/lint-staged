var stagedFiles = require('staged-files');
var map = require('map-stream');
var npmRun = require('npm-run');
var spawn = require("gulp-spawn")
var filter = require("gulp-filter")
var eslint = require('gulp-eslint')


var log = function(file, cb) {
    console.log(JSON.stringify(file));
    cb(null, file);
};

stagedFiles()
    // .pipe(filter(['*.js']))
    // .pipe(map(log))
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    // .pipe(log)
