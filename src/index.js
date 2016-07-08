var sgf = require('staged-git-files')
var minimatch = require('minimatch')
var ora = require('ora')
var assign = require('object-assign')
var appRoot = require('app-root-path')
var config = require(appRoot.resolve('package.json'))
var runScript = require('./runScript')

var defaultLinters = {}
var customLinters = config['lint-staged']
var linters = assign(defaultLinters, customLinters)
var spinner = ora('Starting lint-staged').start()

sgf('ACM', function (err, results) {
    if (err) {
        console.error(err)
    }
    var filePaths = results.map(function (file) {
        return file.filename
    })
    if (filePaths.length) {
        Object.keys(linters).forEach(function (key) {
            var linter = linters[key]
            var fileList = filePaths.filter(minimatch.filter(key, { matchBase: true }))
            if (fileList.length) {
                spinner.text = 'Running ' + Array.isArray(linter) ? linter.join(' → ') : linter + '...'
                runScript(linter, fileList, config, function (error, exitCode) {
                    if (error) {
                        console.error(error)
                    }
                    if (exitCode > 0) {
                        console.log('😱  %s found some issues. Fix them and try again.', linter, exitCode)
                    }
                    spinner.stop()
                    spinner.clear()
                })
            } else {
                spinner.stop()
            }
        })
    } else {
        spinner.stop()
        console.log('\n👀  Nothing to lint. `git add` some files and try again...\n')
    }
})

