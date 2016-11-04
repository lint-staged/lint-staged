'use strict'

const minimatch = require('minimatch')

module.exports = function generateTasks(config, filePaths) {
    const linters = config.linters !== undefined ? config.linters : config
    return Object.keys(linters)
        .map((pattern) => {
            const commands = linters[pattern]
            const fileList = filePaths.filter(
                minimatch.filter(pattern, {
                    matchBase: true,
                    dot: true
                })
            )
            if (fileList.length) {
                return {
                    pattern,
                    commands,
                    fileList
                }
            }
            return undefined
        }).filter(Boolean) // Filter undefined values
}
