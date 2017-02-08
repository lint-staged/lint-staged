/* global process */
/* eslint no-console: 0 */

'use strict'

const path = require('path')
const sgf = require('staged-git-files')
const appRoot = require('app-root-path')
const Listr = require('listr')
const cosmiconfig = require('cosmiconfig')

const packageJson = require(appRoot.resolve('package.json')) // eslint-disable-line
const runScript = require('./runScript')
const generateTasks = require('./generateTasks')
const cgf = require('./changedGitFiles')

// Force colors for packages that depend on https://www.npmjs.com/package/supports-color
// but do this only in TTY mode
if (process.stdout.isTTY) {
    process.env.FORCE_COLOR = true
}

const gitFilesCallback = opts => (err, files) => {
    if (err) {
        console.error(err)
    }

    if (!files || files.length === 0) {
        return
    }

    const { config, verbose, concurrent, renderer, gitDir } = opts
    const resolvedFiles = {}
    files.forEach((file) => {
        const absolute = path.resolve(gitDir, file.filename)
        const relative = path.relative(gitDir, absolute)
        resolvedFiles[relative] = absolute
    })

    const tasks = generateTasks(config, resolvedFiles)
        .map(task => ({
            title: `Running tasks for ${ task.pattern }`,
            task: () => (
                new Listr(
                    runScript(
                        task.commands,
                        task.fileList,
                        packageJson,
                        { gitDir, verbose }
                    )
                )
            )
        }))


    if (tasks.length) {
        new Listr(tasks, { concurrent, renderer }).run().catch((error) => {
            console.error(error.message)
            process.exit(1)
        })
    }
}

cosmiconfig('lint-staged', {
    rc: '.lintstagedrc',
    rcExtensions: true
})
    .then((result) => {
        // result.config is the parsed configuration object
        // result.filepath is the path to the config file that was found
        const config = result.config
        const verbose = config.verbose
        // Output config in verbose mode
        if (verbose) console.log(config)
        const concurrent = typeof config.concurrent !== 'undefined' ? config.concurrent : true
        const renderer = verbose ? 'verbose' : 'update'
        const gitDir = config.gitDir ? path.resolve(config.gitDir) : process.cwd()

        const opMode = process.argv[2] || 'commit'
        const callback = gitFilesCallback({ config, verbose, concurrent, renderer, gitDir })

        if (['checkout', 'merge', 'rewrite'].includes(opMode)) {
            cgf(opMode, callback)
        } else if (opMode === 'commit') {
            sgf.cwd = gitDir
            sgf('ACM', callback)
        } else {
            console.error(`Unknown op mode ${ opMode }. Make sure your setup is correct.`)
        }
    })
    .catch((parsingError) => {
        console.error(`Could not parse lint-staged config.
Make sure you have created it. See https://github.com/okonet/lint-staged#readme.

${ parsingError }
`)
        process.exit(1)
    })
