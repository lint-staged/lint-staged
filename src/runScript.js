'use strict'

const chunk = require('lodash/chunk')
const dedent = require('dedent')
const execa = require('execa')
const logSymbols = require('log-symbols')
const pMap = require('p-map')
const getConfig = require('./getConfig').getConfig
const calcChunkSize = require('./calcChunkSize')
const findBin = require('./findBin')
const resolveGitDir = require('./resolveGitDir')

const debug = require('debug')('lint-staged:run-script')

module.exports = function runScript(commands, pathsToLint, scripts, config, debugMode) {
  debug('Running script with commands %o', commands)

  const normalizedConfig = getConfig(config)
  const chunkSize = normalizedConfig.chunkSize
  const concurrency = normalizedConfig.subTaskConcurrency
  const gitDir = resolveGitDir()

  const filePathChunks = chunk(pathsToLint, calcChunkSize(pathsToLint, chunkSize))

  const lintersArray = Array.isArray(commands) ? commands : [commands]

  return lintersArray.map(linter => ({
    title: linter,
    task: () => {
      try {
        const res = findBin(linter, scripts, debugMode)

        // Only use gitDir as CWD if we are using the git binary
        // e.g `npm` should run tasks in the actual CWD
        const execaOptions =
          /git(\.exe)?$/i.test(res.bin) && gitDir !== process.cwd() ? { cwd: gitDir } : {}

        const errors = []
        const mapper = pathsChunk => {
          const args = res.args.concat(pathsChunk)

          debug('bin:', res.bin)
          debug('args: %O', args)
          debug('opts: %o', execaOptions)

          return (
            execa(res.bin, args, Object.assign({}, execaOptions))
              /* If we don't catch, pMap will terminate on first rejection */
              /* We want error information of all chunks */
              .catch(err => {
                errors.push(err)
              })
          )
        }

        return pMap(filePathChunks, mapper, { concurrency })
          .catch(err => {
            /* This will probably never be called. But just in case.. */
            throw new Error(dedent`
              ${logSymbols.error} ${linter} got an unexpected error.
              ${err.message}
            `)
          })
          .then(() => {
            if (errors.length === 0) return `${logSymbols.success} ${linter} passed!`

            const errStdout = errors.map(err => err.stdout).join('')
            const errStderr = errors.map(err => err.stderr).join('')

            // prettier-ignore
            throw new Error(dedent`
              ${logSymbols.error} ${linter} found some errors. Please fix them and try committing again.
              ${errStdout}
              ${errStderr}
            `)
          })
      } catch (err) {
        throw err
      }
    }
  }))
}
