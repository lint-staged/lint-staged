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
                        const npmStream = execa.spawn(res.bin, res.args, {
                            stdio: 'inherit'
                        })
                        npmStream.on('exit', code => {
                            if (code > 0) {
                                reject(`${linter} found some errors. Please fix them and try committing again`)
                            } else {
                                resolve(`${linter} passed!`)
                            }
                        })
                    })
                } catch (err) {
                    throw new Error(`${linter} not found. Try 'npm install ${linter}'`)
                }
            }
        }
    })
}

