'use strict'

const path = require('path')

module.exports = function resolvePaths(filePaths, relativeTo) {
    return filePaths.map((file) => {
        if (!relativeTo) relativeTo = process.cwd() // eslint-disable-line
        return path.resolve(path.relative(process.cwd(), relativeTo), file.filename)
    })
}
