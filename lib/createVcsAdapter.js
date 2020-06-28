const GitWorkflow = require('./gitWorkflow')

/**
 *
 * @param {string} adapterPath
 * @param {Object} adapterOptions
 * @param {Object} logger
 * @returns {LintStaged.Adapter}
 */
module.exports = function (adapterPath, adapterOptions, logger) {
  const Adapter = adapterPath ? requireAdapter(adapterPath) : GitWorkflow

  const vcsAdapter = new Adapter(adapterOptions, logger)

  return vcsAdapter
}

/**
 *
 * @param {string} adapterModuleOrPath
 * @returns {LintStaged.Adapter}
 */
function requireAdapter(adapterModuleOrPath) {
  return require(adapterModuleOrPath)
}
