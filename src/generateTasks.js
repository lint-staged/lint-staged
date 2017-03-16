'use strict'

const path = require('path')
const minimatch = require('minimatch')
const resolveGitDir = require('./resolveGitDir')

module.exports = function generateTasks(config, files) {
    const linters = config.linters !== undefined ? config.linters : config
    const gitDir = resolveGitDir(config)
    return Object.keys(linters)
        .map((pattern) => {
            const commands = linters[pattern]
            const filter = minimatch.filter(pattern, {
                matchBase: true,
                dot: true
            })
            const fileList = files
                .filter(filter)
                .map(file => path.resolve(gitDir, file)) // Return absolute path after the filter
            return {
                pattern,
                commands,
                fileList
            }
        })
}
