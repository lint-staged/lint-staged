/* global process */
/* eslint no-console: 0 */

'use strict'

process.env.FORCE_COLOR = true // Force colors for packages that depend on https://www.npmjs.com/package/supports-color

const sgf = require('staged-git-files')
const minimatch = require('minimatch')
const assign = require('object-assign')
const appRoot = require('app-root-path')
const Listr = require('listr')
const path = require('path')

const config = require(appRoot.resolve('package.json')) // eslint-disable-line
const runScript = require('./runScript')

const defaultLinters = {}
const customLinters =
    config['lint-staged'].linters !== undefined ?
        config['lint-staged'].linters : config['lint-staged']
const linters = assign(defaultLinters, customLinters)

// If git root is defined -> Set git root as sgf's cwd
if (config['lint-staged']['git-root'] !== undefined) {
    sgf.cwd = path.resolve(config['lint-staged']['git-root'])
}
sgf('ACM', (err, results) => {
    if (err) {
        console.error(err)
    }
    const filePaths = results.map(file => file.filename)
    const tasks = Object.keys(linters)
        .map((key) => {
            const linter = linters[key]
            const fileList = filePaths.filter(minimatch.filter(key, { matchBase: true }))
            if (fileList.length) {
                // If current working dir is not the git root -> resolve file paths accordingly
                if (sgf.cwd !== process.cwd()) {
                    const relpath = path.relative(process.cwd(), sgf.cwd)
                    for (const i in fileList) {
                        fileList[i] = path.resolve(relpath, fileList[i])
                    }
                }
                return {
                    title: `Running tasks for ${ key }`,
                    task: () => (new Listr(runScript(linter, fileList, config)))
                }
            }
            return undefined
        })
        .filter(task => typeof task !== 'undefined') // Filter undefined values

    if (tasks.length) {
        new Listr(tasks).run().catch((error) => {
            console.error(error)
            process.exit(1)
        })
    }
})

