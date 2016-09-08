'use strict'

const findBin = require('./findBin')
const execa = require('execa')

module.exports = function runScript (linters, pathsToLint, config) {
    const lintersArray = Array.isArray(linters) ? linters : [linters]
    return lintersArray.map(linter => {
        return {
            title: linter,
            task: () => {
                try {
                    const res = findBin(linter, pathsToLint, config)
                    return new Promise((resolve, reject) => {
                        execa(res.bin, res.args)
                            .then(() => {
                                resolve(`${linter} passed!`)
                            })
                            .catch(err => {
                                reject(`
🚨  ${linter} found some errors. Please fix them and try committing again.

${err.stdout}
`
                                )
                            })
                    })
                } catch (err) {
                    throw new Error(`${linter} not found. Try 'npm install ${linter}'`)
                }
            }
        }
    })
}

