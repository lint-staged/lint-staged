'use strict'

const _ = require('lodash')
const defaultConfig = require('./defaultConfig')

/**
 * Check if the config is "simple" i.e. doesn't contains any of full config keys.
 *
 * This check is not concerned with the validity of the config. For example,
 * en empty object or array will satisfy the check.
 *
 * @param config
 * @returns {boolean}
 */
function isSimple(config) {
  /*
    Scenarios which satisfy `isSimple` check:
    - []
    - {}
    - [
        {
          "filters": ["src/*.js", "!src/*.ignore.js"],
          "commands": ["eslint --fix", "git add"]
        }
      ]
    - { "*.js": ["eslint --fix", "git add"] }

    Scenario which do not satisfy the check:
    - {
        "linters": { "*.js": ["eslint --fix", "git add"] }
      }
    - {
        "linters": []
      }
  */
  return (
    Array.isArray(config) ||
    (_.isObject(config) &&
      !_.has(config, 'linters') &&
      _.intersection(Object.keys(defaultConfig), Object.keys(config)).length === 0)
  )
}

/**
 * Expand shorthand object format to the array format. If `linters` is an array, it is
 * returned as is. If it is a plain object, it is converted from
 * `{ "*.js": "eslint --fix" }` to `[ { filtes: ["*.js"], commands: "eslint --fix" } ]`
 *
 * @param {Array|Object|null|undefined} linters
 */
function expandShorthands(linters) {
  if (_.isNil(linters) || _.isEmpty(linters)) return []

  if (Array.isArray(linters)) return linters

  return Object.keys(linters).reduce((expanded, filter) => {
    expanded.push({ filters: [filter], commands: linters[filter] })
    return expanded
  }, [])
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
  const isSimpleConfig = isSimple(sourceConfig)
  // At this point, the config hasn't been validated.
  const linters = expandShorthands(
    // `_.get` is used because `linters` property might not be present.
    isSimpleConfig ? sourceConfig : _.get(sourceConfig, 'linters')
  )
  const config = _.defaultsDeep(
    { linters }, // Do not mutate sourceConfig!!!
    isSimpleConfig ? null : sourceConfig,
    defaultConfig
  )

  // Check if renderer is set in sourceConfig and if not, set accordingly to verbose
  if (_.isObject(sourceConfig) && !_.has(sourceConfig, 'renderer')) {
    config.renderer = config.verbose ? 'verbose' : 'update'
  }

  return config
}
