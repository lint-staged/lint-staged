'use strict'

const findBin = require('./findBin')
const execa = require('execa')

module.exports = function runScript(commands, pathsToLint, packageJson, options) {
    const lintersArray = Array.isArray(commands) ? commands : [commands]
    return lintersArray.map(linter => ({
        title: linter,
        task: () => {
            const execaOptions = options && options.gitDir ? { cwd: options.gitDir } : {}
            try {
                const res = findBin(linter, pathsToLint, packageJson, options)
                return new Promise((resolve, reject) => {
                    execa(res.bin, res.args, execaOptions)
                        .then(() => {
                            resolve(`${ linter } passed!`)
                        })
                        .catch((err) => {
                            reject(new Error(`
🚫  ${ linter } found some errors. Please fix them and try committing again.

${ err.stderr }
${ err.stdout }
`))
                        })
                })
            } catch (err) {
                throw err
            }
        }
    }))
}

