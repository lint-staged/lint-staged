'use strict'

const findBin = require('./findBin')
const execa = require('execa')

module.exports = function runScript(commands, pathsToLint, packageJson, options) {
    const lintersArray = Array.isArray(commands) ? commands : [commands]
    return lintersArray.map(linter => ({
        title: linter,
        task: () => {
            try {
                const res = findBin(linter, pathsToLint, packageJson, options)
                const execaOptions =
                    res.bin !== 'npm' && options && options.gitDir ? { cwd: options.gitDir } : {}
                return new Promise((resolve, reject) => {
                    const task = execa(res.bin, res.args, execaOptions)
                    task.then((result) => {
                        const output = options.verbose
                            ? `✅ ${ linter } passed!
${ result.stderr }
${ result.stdout }`
                            : `✅ ${ linter } passed!`
                        resolve(output)
                    }).catch((err) => {
                        reject(new Error(`🚫 ${ linter } found some errors. Please fix them and try committing again.
${ err.stderr }
${ err.stdout }`))
                    })
                })
            } catch (err) {
                throw err
            }
        }
    }))
}

