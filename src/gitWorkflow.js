const path = require('path')
const execa = require('execa')

module.exports = {

    getWorkingCopyPath: function(gitPath) {
        return path.join(process.cwd(), gitPath)
    },

    getCmdArgs: function(gitPath) {
        const wcDir = this.getWorkingCopyPath(gitPath)
        return ['--git-dir', path.join(wcDir, '.git')]
    },

    execGit: function(cmd, options) {
        let cwd = options.cwd
        if (!cwd) cwd = process.cwd()
        return execa('git', this.getCmdArgs(cwd).concat(cmd), { cwd: path.resolve(cwd) })
    },

    gitStashSave: function(options) {
        return this.execGit(['stash', '--keep-index'], options)
    },

    gitStashPop: function(gitPath) {
        // return execa('git', getCmdArgs.concat(['stash', 'pop']))
    }
}
