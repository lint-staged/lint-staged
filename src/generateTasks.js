'use strict'

const path = require('path')
const minimatch = require('minimatch')
const pathIsInside = require('path-is-inside')
const getConfig = require('./getConfig').getConfig
const resolveGitDir = require('./resolveGitDir')

module.exports = function generateTasks(config, relFiles) {
  const normalizedConfig = getConfig(config) // Ensure we have a normalized config
  const linters = normalizedConfig.linters
  const globOptions = normalizedConfig.globOptions

  const gitDir = resolveGitDir()
  const cwd = process.cwd()
  const files = relFiles.map(file => path.resolve(gitDir, file))

  return Object.keys(linters).map(pattern => {
    const commands = linters[pattern]
    const filter = minimatch.filter(pattern, globOptions)

    const fileList = files
      // Only worry about children of the CWD
      .filter(file => pathIsInside(file, cwd))
      // Make the paths relative to CWD for filtering
      .map(file => path.relative(cwd, file))
      // We want to filter before resolving paths
      .filter(filter)
      // Return absolute path after the filter is run
      .map(file => path.resolve(cwd, file))

    return {
      pattern,
      commands,
      fileList
    }
  })
}
