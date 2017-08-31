/* eslint no-console: 0 */
/* eslint no-prototype-builtins: 0 */
const intersection = require('lodash/intersection')
const defaultsDeep = require('lodash/defaultsDeep')
const isObject = require('lodash/isObject')

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
 * Check if the config is "simple" i.e. doesn't contains any of full config keys
 *
 * @param config
 * @returns {boolean}
 */
function isSimple(config) {
  return (
    isObject(config) &&
    !config.hasOwnProperty('linters') &&
    intersection(Object.keys(defaultConfig), Object.keys(config)).length === 0
  )
}

/**
 * For a given configuration object that we retrive from .lintstagedrc or package.json
 * construct a full configuration with all options set.
 *
 * This is a bit tricky since we support 2 different syntxes: simple and full
 * For simple config, only the `linters` configuration is provided.
 *
 * @param {Object} sourceConfig
 * @returns {{
 *  concurrent: boolean, chunkSize: number, gitDir: string, globOptions: {matchBase: boolean, dot: boolean}, linters: {}, subTaskConcurrency: number, renderer: string, verbose: boolean
 * }}
 */
module.exports = function getConfig(sourceConfig) {
  const config = defaultsDeep(
    {}, // Do not mutate sourceConfig!!!
    isSimple(sourceConfig) ? { linters: sourceConfig } : sourceConfig,
    defaultConfig
  )

  // Check if renderer is set in sourceConfig and if not, set accordingly to verbose
  if (isObject(sourceConfig) && !sourceConfig.hasOwnProperty('renderer')) {
    config.renderer = config.verbose ? 'verbose' : 'update'
  }

  return config
}
