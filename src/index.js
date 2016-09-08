'use strict'

const sgf = require('staged-git-files')
const minimatch = require('minimatch')
const assign = require('object-assign')
const appRoot = require('app-root-path')
const config = require(appRoot.resolve('package.json'))
const runScript = require('./runScript')
const Listr = require('listr')

const defaultLinters = {}
const customLinters = config['lint-staged']
const linters = assign(defaultLinters, customLinters)

sgf('ACM', function (err, results) {
    if (err) {
        console.error(err)
    }
    const filePaths = results.map(file => file.filename)
    const tasks = Object.keys(linters).map(key => {
        const linter = linters[key]
        const fileList = filePaths.filter(minimatch.filter(key, { matchBase: true }))
        if (fileList.length) {
            return {
                title: `Running tasks for ${key}`,
                task: () => {
                    return new Listr(runScript(linter, fileList, config))
                }
            }
        }
    }).filter(task => typeof task !== 'undefined') // Filter undefined values

    if (tasks.length) {
        new Listr(tasks).run().catch(err => {
            console.error(err)
            process.exit(1)
        })
    }
})

