/* global process */
/* eslint no-console: 0 */

'use strict'

process.env.FORCE_COLOR = true // Force colors for packages that depend on https://www.npmjs.com/package/supports-color

const sgf = require('staged-git-files')
const appRoot = require('app-root-path')
const Listr = require('listr')
const path = require('path')

const config = require(appRoot.resolve('package.json')) // eslint-disable-line
const runScript = require('./runScript')
const resolvePaths = require('./resolvePaths')
const generateTasks = require('./generateTasks')

// If git root is defined -> Set git root as sgf's cwd
if (config['lint-staged']['git-root'] !== undefined) {
    sgf.cwd = path.resolve(config['lint-staged']['git-root'])
}

sgf('ACM', (err, files) => {
    if (err) {
        console.error(err)
    }

    const tasks = generateTasks(config['lint-staged'], resolvePaths(files))
        .map(task => ({
            title: `Running tasks for ${ task.pattern }`,
            task: () => (new Listr(runScript(task.commands, task.fileList, config)))
        }))


    if (tasks.length) {
        new Listr(tasks).run().catch((error) => {
            console.error(error)
            process.exit(1)
        })
    }
})

