const path = require('path')
const execa = require('execa')

module.exports = {

    getAbsolutePath(dir) {
        return path.isAbsolute(dir) ? dir : path.resolve(dir)
    },

    getCmdArgs(gitDir) {
        if (gitDir) {
            return ['--git-dir', this.getAbsolutePath(gitDir)]
        }
        return []
    },

    execGit(cmd, options) {
        const cwd = options && options.cwd ? options.cwd : process.cwd()
        const gitDir = options && options.gitDir
        return execa('git', this.getCmdArgs(gitDir).concat(cmd), { cwd: this.getAbsolutePath(cwd) })
    },

    gitStashSave(options) {
        return this.execGit(['stash', '--keep-index'], options)
    },

    gitStashPop(options) {
        return this.execGit(['checkout', '.'], options)
            .then(() => this.execGit(['stash', 'pop'], options))
    },

    gitRestore(options) {
        return this.execGit(['checkout', '--merge', 'stash', '--', '.'], options)
            .then(() => this.execGit(['reset', '.'], options))
            .then(() => this.execGit(['stash', 'drop'], options))
    }
}
