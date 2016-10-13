'use strict'

const findBin = require('./findBin')
const execa = require('execa')

module.exports = function runScript(commands, pathsToLint, packageJson) {
    const lintersArray = Array.isArray(commands) ? commands : [commands]
    return lintersArray.map(linter => ({
        title: linter,
        task: () => {
            try {
                const res = findBin(linter, pathsToLint, packageJson)
                return new Promise((resolve, reject) => {
                    execa(res.bin, res.args)
                        .then(() => {
                            resolve(`${ linter } passed!`)
                        })
                        .catch((err) => {
                            reject(`
🚨  ${ linter } found some errors. Please fix them and try committing again.

${ err.stderr }
${ err.stdout }
`
                            )
                        })
                })
            } catch (err) {
                throw new Error(`${ linter } not found. Try 'npm install ${ linter }'`)
            }
        }
    }))
}

