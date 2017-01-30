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

// Force colors for packages that depend on https://www.npmjs.com/package/supports-color
// but do this only in TTY mode
if (process.stdout.isTTY) {
    process.env.FORCE_COLOR = true
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
        sgf.cwd = gitDir

        sgf('ACM', (err, files) => {
            if (err) {
                console.error(err)
            }

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
        })
    })
    .catch((parsingError) => {
        console.error(`Could not parse lint-staged config.
Make sure you have created it. See https://github.com/okonet/lint-staged#readme.

${ parsingError }
`)
        process.exit(1)
    })
