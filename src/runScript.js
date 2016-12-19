'use strict'

const findBin = require('./findBin')
const execa = require('execa')

module.exports = function runScript(commands, pathsToLint, packageJson, gitDir) {
    const lintersArray = Array.isArray(commands) ? commands : [commands]
    const execaOptions = gitDir ? { cwd: gitDir } : {}
    return lintersArray.map(linter => ({
        title: linter,
        task: () => {
            try {
                const res = findBin(linter, pathsToLint, packageJson)
                return new Promise((resolve, reject) => {
                    execa(res.bin, res.args, execaOptions)
                        .then(() => {
                            resolve(`${ linter } passed!`)
                        })
                        .catch((err) => {
                            reject(new Error(`
🚫 ${ linter } found some errors. Please fix them and try committing again.

${ err.stderr }
${ err.stdout }
`))
                        })
                })
            } catch (err) {
                throw new Error(`${ linter } not found. Try 'npm install ${ linter }'`)
            }
        }
    }))
}

