'use strict'

/**
 * Default config object
 *
 * @type {{concurrent: boolean, chunkSize: number, gitDir: string, globOptions: {matchBase: boolean, dot: boolean}, linters: {}, subTaskConcurrency: number, renderer: string, verbose: boolean}}
 */
module.exports = {
  concurrent: true,
  chunkSize: Number.MAX_SAFE_INTEGER,
  gitDir: '.',
  globOptions: {
    matchBase: true,
    dot: true
  },
  linters: [],
  subTaskConcurrency: 1,
  renderer: 'update',
  verbose: false
}
