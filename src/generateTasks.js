'use strict'

const multimatch = require('multimatch')

const readConfigOption = require('./readConfigOption')

module.exports = function generateTasks(config, files) {
    const linters = config.linters !== undefined ? config.linters : config
    const resolve = file => files[file]
    return Object.keys(linters)
        .map((pattern) => {
            const commands = linters[pattern]
            const globOptions = readConfigOption(config, 'globOptions', {})
            const fileList = multimatch(Object.keys(files), pattern, Object.assign({
                matchBase: true,
                dot: true
            }, globOptions)).map(resolve)
            return {
                pattern,
                commands,
                fileList
            }
        })
}
