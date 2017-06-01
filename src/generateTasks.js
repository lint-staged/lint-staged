'use strict'

const minimatch = require('minimatch')

const readConfigOption = require('./readConfigOption')

module.exports = function generateTasks(config, files) {
    const linters = config.linters !== undefined ? config.linters : config
    const resolve = file => files[file]
    return Object.keys(linters)
        .map((pattern) => {
            const commands = linters[pattern]
            const globOptions = readConfigOption(config, 'globOptions', {})
            const filter = minimatch.filter(pattern, Object.assign({
                matchBase: true,
                dot: true
            }, globOptions))
            const fileList = Object.keys(files).filter(filter).map(resolve)
            return {
                pattern,
                commands,
                fileList
            }
        })
}
