'use strict'

const chunk = require('lodash/chunk')
const execa = require('execa')
const logSymbols = require('log-symbols')
const pMap = require('p-map')
const getConfig = require('./config-util').getConfig
const calcChunkSize = require('./calcChunkSize')
const findBin = require('./findBin')

module.exports = function runScript(commands, pathsToLint, packageJson, config) {
  const normalizedConfig = getConfig(config)
  const chunkSize = normalizedConfig.chunkSize
  const concurrency = normalizedConfig.subTaskConcurrency
  const gitDir = normalizedConfig.gitDir

  const filePathChunks = chunk(pathsToLint, calcChunkSize(pathsToLint, chunkSize))

  const commandsArray = Array.isArray(commands) ? commands : [commands]

  return commandsArray.map(cmd => ({
    title: cmd,
    task: () => {
      try {
        const res = findBin(cmd, packageJson, config)

        const separatorArgs = /npm(\.exe)?$/i.test(res.bin) ? ['--'] : []

        // Only use gitDir as CWD if we are using the git binary
        // e.g `npm` should run tasks in the actual CWD
        const execaOptions =
          /git(\.exe)?$/i.test(res.bin) && config && gitDir ? { cwd: gitDir } : {}

        const errors = []
        const mapper = pathsChunk => {
          const args = res.args.concat(separatorArgs, pathsChunk)

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
            throw new Error(`${logSymbols.error} ${cmd} got an unexpected error.
${err.message}`)
          })
          .then(() => {
            if (errors.length === 0) return `${logSymbols.success} ${cmd} passed!`

            const errStdout = errors.map(err => err.stdout).join('')
            const errStderr = errors.map(err => err.stderr).join('')

            throw new Error(`${logSymbols.error} ${cmd} found some errors. Please fix them and try committing again.
${errStdout}
${errStderr}`)
          })
      } catch (err) {
        throw err
      }
    }
  }))
}
