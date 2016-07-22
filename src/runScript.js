'use strict'

var findBin = require('./findBin')
const execa = require('execa')

module.exports = function runScript (linters, pathsToLint, config) {
    const lintersArray = Array.isArray(linters) ? linters : [linters]
    return lintersArray.map(linter => {
        return {
            title: linter,
            task: () => {
                return new Promise((resolve, reject) => {
                    findBin(linter, pathsToLint, config, (err, binPath, args) => {
                        if (err) {
                            reject(err)
                        }
                        const npmStream = execa.spawn(binPath, args, {
                            stdio: 'inherit' // <== IMPORTANT: use this option to inherit the parent's environment
                        })
                        npmStream.on('exit', code => {
                            // exitCode = code
                            if (code > 0) {
                                reject(`${linter} found some errors. Please fix them and try committing again`)
                            } else {
                                resolve(`${linter} passed!`)
                            }
                        })
                        // npmStream.on('close', next)
                    })
                })
            }
        }
    })
}

