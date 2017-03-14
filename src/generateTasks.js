'use strict'

const minimatch = require('minimatch')

module.exports = function generateTasks(config, files) {
    const linters = config.linters !== undefined ? config.linters : config
    const resolve = file => files[file]
    return Object.keys(linters)
        .map((pattern) => {
            const commands = linters[pattern]
            const filter = minimatch.filter(pattern, {
                matchBase: true,
                dot: true
            })
            const fileList = Object.keys(files).filter(filter).map(resolve)
            return {
                pattern,
                commands,
                fileList
            }
        })
}
