/* eslint no-console: 0 */
const { intersection, merge } = require('lodash')

const defaultConfig = {
  concurrent: true,
  gitDir: '.',
  globOptions: {
    matchBase: true,
    dot: true
  },
  linters: {},
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
 * @param {Object} config
 * @returns {{
 *   concurrent: boolean, gitDir: string, linters: Object, renderer: string, verbose: boolean
 * }}
 */

module.exports = function getConfig(config) {
  // Check if the config is "simple" i.e. doesn't contains any of full config keys
  if (
    !('linters' in config) &&
    intersection(Object.keys(defaultConfig), Object.keys(config)).length === 0
  ) {
    return merge(defaultConfig, {
      linters: config
    })
  }
  // Output config in verbose mode
  // if (verbose) console.log(completeConfig)
  return merge(defaultConfig, config, {
    renderer: config.verbose ? 'verbose' : 'update'
  })
}
