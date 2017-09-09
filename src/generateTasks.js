'use strict'

const path = require('path')
const mm = require('micromatch')
const getConfig = require('./config-util').getConfig
const resolveGitDir = require('./resolveGitDir')

module.exports = function generateTasks(config, files) {
  const normalizedConfig = getConfig(config) // Ensure we have a normalized config
  const linters = normalizedConfig.linters
  const gitDir = normalizedConfig.gitDir
  const globOptions = normalizedConfig.globOptions
  const resolvedGitDir = resolveGitDir(gitDir)
  return linters.map(linter => {
    const filters = linter.filters
    const commands = linter.commands
    const fileList =
      // We want to filter before resolving paths
      mm(files, filters, globOptions)
        // Return absolute path after the filter is run
        .map(file => path.resolve(resolvedGitDir, file))
    return {
      title: filters.join(', '),
      commands,
      fileList
    }
  })
}
