const GitAdapter = require('./gitAdapter')

/**
 *
 * @param {string} adapterPath
 * @param {Object} adapterOptions
 * @param {Object} logger
 * @returns {LintStaged.Adapter}
 */
module.exports = function (adapterPath, adapterOptions) {
  const Adapter = adapterPath ? requireAdapter(adapterPath) : GitAdapter

  const vcsAdapter = new Adapter(adapterOptions)

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
