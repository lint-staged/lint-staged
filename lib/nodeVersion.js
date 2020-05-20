const debugLog = require('debug')('lint-staged:node-version')
const semverSatisfies = require('semver/functions/satisfies')

const { wrongNodeVersion } = require('./messages')

/**
 * The required Node.js semver range
 * - all versions after 12 are supported
 * - all versions of v10 that are LTS, are supported
 */
const REQUIRED_NODE_VERSION = '>=12 || 10.13.0 - 10.20.1'

const CURRENT_NODE_VERSION = process.version.replace('v', '')

/**
 * Show a helpful warning message about the required Node.js version.
 * Do not declare in package.json because installing `lint-staged` shouldn't
 * cause failures in CI or other environments where it's not actually used.
 */
const requireNodeVersion = async (version = CURRENT_NODE_VERSION) => {
  debugLog('Detected Node.js v%s', version)
  if (!semverSatisfies(version, REQUIRED_NODE_VERSION)) {
    const message = wrongNodeVersion(version, REQUIRED_NODE_VERSION)
    const error = new Error(message)
    error.isNodeVersionError = true
    throw error
  }
}

module.exports = requireNodeVersion
