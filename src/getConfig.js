/* eslint no-console: 0 */
/* eslint no-prototype-builtins: 0 */
const { intersection, defaultsDeep, isObject } = require('lodash')

/**
 * Default config object
 *
 * @type {{concurrent: boolean, chunkSize: number, gitDir: string, globOptions: {matchBase: boolean, dot: boolean}, linters: {}, subTaskConcurrency: number, renderer: string, verbose: boolean}}
 */
const defaultConfig = {
  concurrent: true,
  chunkSize: Number.MAX_SAFE_INTEGER,
  gitDir: '.',
  globOptions: {
    matchBase: true,
    dot: true
  },
  linters: {},
  subTaskConcurrency: 1,
  renderer: 'update',
  verbose: false
}

/**
 * For a given configuration object that we retrive from .lintstagedrc or pacakge.json
 * construct a full configuration with all options set.
 *
 * This is a bit tricky since we support 2 different syntxes: simple and full
 * For simple config, only the `linters` configuration is provided.
 *
 * @param {Object} sourceConfig
 * @returns {{
 *   concurrent: boolean, gitDir: string, linters: Object, renderer: string, verbose: boolean
 * }}
 */
module.exports = function getConfig(sourceConfig) {
  // Do not mutate sourceConfig!!!
  const config = defaultsDeep({}, sourceConfig, defaultConfig)

  // Check if the config is "simple" i.e. doesn't contains any of full config keys
  if (
    isObject(sourceConfig) &&
    !sourceConfig.hasOwnProperty('linters') &&
    intersection(Object.keys(defaultConfig), Object.keys(sourceConfig)).length === 0
  ) {
    // and set `linters` explicetly
    config.linters = sourceConfig
  }

  // Check if renderer is set in sourceConfig and if not, set accordingly to verbose
  if (isObject(sourceConfig) && !sourceConfig.hasOwnProperty('renderer')) {
    config.renderer = config.verbose ? 'verbose' : 'update'
  }

  // Output config in verbose mode
  // if (verbose) console.log(completeConfig)

  return config
}
