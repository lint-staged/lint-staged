'use strict'

const path = require('path')

module.exports = function resolvePaths(filePaths, relativeTo) {
    const cwd = process.cwd()
    const base = relativeTo || cwd
    return filePaths.map(file => path.relative(base, path.resolve(base, file.filename)))
}
