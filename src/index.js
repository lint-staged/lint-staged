/* global process */
/* eslint no-console: 0 */

'use strict'

process.env.FORCE_COLOR = true // Force colors for packages that depend on https://www.npmjs.com/package/supports-color

const path = require('path')
const sgf = require('staged-git-files')
const appRoot = require('app-root-path')
const Listr = require('listr')
const cosmiconfig = require('cosmiconfig')

const packageJson = require(appRoot.resolve('package.json')) // eslint-disable-line
const runScript = require('./runScript')
const resolvePaths = require('./resolvePaths')
const generateTasks = require('./generateTasks')

cosmiconfig('lint-staged', {
    rc: '.lintstagedrc',
    rcExtensions: true
})
    .then((result) => {
        // result.config is the parsed configuration object
        // result.filepath is the path to the config file that was found
        const config = result.config
        const concurrent = config.concurrent || true
        const gitDir = config.gitDir ? path.resolve(config.gitDir) : process.cwd()

        // If gitDir is defined -> set git root as sgf's cwd
        if (gitDir !== process.cwd()) {
            sgf.cwd = gitDir
        }

        sgf('ACM', (err, files) => {
            if (err) {
                console.error(err)
            }

            const tasks = generateTasks(config, resolvePaths(files, gitDir))
                .map(task => ({
                    title: `Running tasks for ${ task.pattern }`,
                    task: () => (new Listr(runScript(task.commands, task.fileList, packageJson)))
                }))


            if (tasks.length) {
                new Listr(tasks, { concurrent }).run().catch((error) => {
                    console.error(error)
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

