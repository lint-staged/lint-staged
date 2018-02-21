'use strict'

const chunk = require('lodash/chunk')
const dedent = require('dedent')
const execa = require('execa')
const logSymbols = require('log-symbols')
const pMap = require('p-map')
const { getConfig } = require('./getConfig')
const calcChunkSize = require('./calcChunkSize')
const findBin = require('./findBin')
const resolveGitDir = require('./resolveGitDir')

const debug = require('debug')('lint-staged:run-script')

module.exports = function runScript(commands, pathsToLint, config) {
  debug('Running script with commands %o', commands)

  const normalizedConfig = getConfig(config)
  const { chunkSize, subTaskConcurrency: concurrency } = normalizedConfig
  const gitDir = resolveGitDir()

  const filePathChunks = chunk(pathsToLint, calcChunkSize(pathsToLint, chunkSize))

  const lintersArray = Array.isArray(commands) ? commands : [commands]

  return lintersArray.map(linter => ({
    title: linter,
    task: () => {
      const { bin, args } = findBin(linter)

      const execaOptions = { reject: false }
      // Only use gitDir as CWD if we are using the git binary
      // e.g `npm` should run tasks in the actual CWD
      if (/git(\.exe)?$/i.test(bin) && gitDir !== process.cwd()) {
        execaOptions.cwd = gitDir
      }

      const mapper = pathsChunk => {
        const binArgs = args.concat(pathsChunk)

        debug('bin:', bin)
        debug('args: %O', binArgs)
        debug('opts: %o', execaOptions)

        return execa(bin, binArgs, Object.assign({}, execaOptions))
      }

      return pMap(filePathChunks, mapper, { concurrency })
        .catch(err => {
          /* This will probably never be called. But just in case.. */
          throw new Error(dedent`
              ${logSymbols.error} ${linter} got an unexpected error.
              ${err.message}
            `)
        })
        .then(results => {
          const errors = results.filter(res => res.failed)
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
    }
  }))
}
