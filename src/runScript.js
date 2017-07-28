'use strict'

const chunk = require('lodash.chunk')
const execa = require('execa')
const pMap = require('p-map')

const calcChunkSize = require('./calcChunkSize')
const findBin = require('./findBin')
const readConfigOption = require('./readConfigOption')

module.exports = function runScript(commands, pathsToLint, packageJson, options) {
    const config = readConfigOption(options, 'config', {})

    const concurrency = readConfigOption(config, 'subTaskConcurrency', 2)
    const chunkSize = calcChunkSize(
        pathsToLint,
        readConfigOption(config, 'chunkSize', Number.MAX_SAFE_INTEGER)
    )

    const filePathChunks = chunk(pathsToLint, chunkSize)

    const lintersArray = Array.isArray(commands) ? commands : [commands]
    let isObject = ( toTest ) => {
        return (typeof toTest === "object" && !Array.isArray(toTest) && toTest !== null)
    }

    return lintersArray.map(linter => ({
        title: isObject( linter ) ? ( linter.name || linter.script ) : linter,
        task: () => {
            try {
                const isComplexCommand = isObject( linter )
                const res = findBin(linter, packageJson, options)

                const separatorArgs = /npm(\.exe)?$/i.test(res.bin)
                    ? ['--'] : [];

                // Only use gitDir as CWD if we are using the git binary
                // e.g `npm` should run tasks in the actual CWD
                const execaOptions =
                    /git(\.exe)?$/i.test(res.bin) && options && options.gitDir
                    ? { cwd: options.gitDir } : {}

                const errors = []
                if( isComplexCommand && linter.prepend )
                    res.args.push( linter.prepend )
                
                const mapper = (pathsChunk) => {
                    let finalPaths = pathsChunk
                    if( isComplexCommand && ( linter.prepend_each || linter.append_each ) )
                        finalPaths = pathsChunk.map( ( currentChunk ) => {
                                        return ( linter.prepend_each || '' ) +
                                                    currentChunk +
                                                    ( linter.append_each || '' ) } )

                    let args = ( isComplexCommand && linter.trap ) ?
                                res.args :
                                res.args.concat(separatorArgs, finalPaths)

                    if( isComplexCommand && linter.append )
                        args.push( linter.append )

                    return execa(res.bin, args, Object.assign({}, execaOptions))
                        /* If we don't catch, pMap will terminate on first rejection */
                        /* We want error information of all chunks */
                        .catch((err) => {
                            errors.push(err)
                        })
                }

                return pMap(filePathChunks, mapper, { concurrency })
                    .catch((err) => {
                        /* This will probably never be called. But just in case.. */
                        throw new Error(`🚫 ${ linter } got an unexpected error.
${ err.message }`)
                    })
                    .then(() => {
                        if (errors.length === 0) return `✅ ${ linter } passed!`

                        const errStdout = errors.map(err => err.stdout).join('')
                        const errStderr = errors.map(err => err.stderr).join('')

                        throw new Error(`🚫 ${ linter } found some errors. Please fix them and try committing again.
${ errStdout }
${ errStderr }`)
                    })
            } catch (err) {
                throw err
            }
        }
    }))
}
