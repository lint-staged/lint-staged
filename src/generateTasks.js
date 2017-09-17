'use strict'

const path = require('path')
const micromatch = require('micromatch')
const getConfig = require('./config-util').getConfig
const resolveGitDir = require('./resolveGitDir')

module.exports = function generateTasks(config, files) {
  const normalizedConfig = getConfig(config) // Ensure we have a normalized config
  const linters = normalizedConfig.linters
  const gitDir = normalizedConfig.gitDir
  const globOptions = normalizedConfig.globOptions
  const resolvedGitDir = resolveGitDir(gitDir)
  return linters.map(linter => {
    const patterns = linter.includes.concat(linter.excludes.map(pattern => `!${pattern}`))
    const commands = linter.commands
    const fileList =
      // We want to filter before resolving paths
      micromatch(files, patterns, globOptions)
        // Return absolute path after the filter is run
        .map(file => path.resolve(resolvedGitDir, file))
    return {
      title: patterns.join(', '),
      commands,
      fileList
    }
  })
}
