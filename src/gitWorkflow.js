const path = require('path')
const execa = require('execa')

module.exports = {

    getCmdArgs(wcPath) {
        return ['--git-dir', path.join(wcPath, '.git')]
    },

    execGit(cmd, options) {
        const cwd = options && options.cwd ? options.cwd : process.cwd()
        return execa('git', this.getCmdArgs(cwd).concat(cmd), { cwd: path.resolve(cwd) })
    },

    gitStashSave(options) {
        return this.execGit(['stash', '--keep-index'], options)
    },

    gitStashPop(options) {
        return this.execGit(['checkout', '.'], options)
            .then(() => this.execGit(['stash', 'pop'], options))
    }
}
