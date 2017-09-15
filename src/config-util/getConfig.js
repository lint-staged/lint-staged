'use strict'

const intersection = require('lodash/intersection')
const defaultsDeep = require('lodash/defaultsDeep')
const isObject = require('lodash/isObject')
const defaultConfig = require('./defaultConfig').defaultConfig

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
          "includes": ["src/*.js"],
          "excludes": ["src/*.ignore.js"],
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
    (isObject(config) &&
      !config.hasOwnProperty('linters') &&
      intersection(Object.keys(defaultConfig), Object.keys(config)).length === 0)
  )
}

function asArray(value) {
  if (Array.isArray(value)) return value
  return [value]
}

/**
 * Expand shorthand object format to the array format. If `linters` is an array, it is
 * returned as is. If it is a plain object, it is converted from
 * `{ "*.js": "eslint --fix" }` to
 * `[ { "includes": ["*.js"], "excludes": [], "commands": "eslint --fix" } ]`
 *
 * @param {Array|Object|null|undefined} sourceConfig
 * @returns {Array<Object>}
 */
function expandShorthands(isSimpleConfig, sourceConfig) {
  if (sourceConfig == null) return []

  const linters = isSimpleConfig ? sourceConfig : sourceConfig.linters
  if (linters == null) return []

  if (Array.isArray(linters)) {
    return linters.map(linter => ({
      includes: linter.includes || [],
      excludes: linter.excludes || [],
      commands: asArray(linter.commands)
    }))
  }

  return Object.keys(linters).map(pattern => ({
    includes: [pattern],
    excludes: [],
    commands: asArray(linters[pattern])
  }))
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
  const config = defaultsDeep(
    // Do not mutate sourceConfig!!!
    { linters: expandShorthands(isSimpleConfig, sourceConfig) },
    isSimpleConfig ? null : sourceConfig,
    defaultConfig
  )

  // Check if renderer is set in sourceConfig and if not, set accordingly to verbose
  if (isObject(sourceConfig) && !sourceConfig.hasOwnProperty('renderer')) {
    config.renderer = config.verbose ? 'verbose' : 'update'
  }

  return config
}
