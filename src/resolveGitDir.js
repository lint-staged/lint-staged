const path = require('path')

module.exports = function resolveGitDir(config) {
    return config && config.gitDir ? path.resolve(config.gitDir) : process.cwd()
}
