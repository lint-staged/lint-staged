'use strict'

const path = require('path')
const minimatch = require('minimatch')
const getConfig = require('./getConfig')
const resolveGitDir = require('./resolveGitDir')

module.exports = function generateTasks(config, files) {
  const { linters, gitDir, globOptions } = getConfig(config) // Ensure we have a normalized config
  return Object.keys(linters).map(pattern => {
    const commands = linters[pattern]
    const filter = minimatch.filter(
      pattern,
      Object.assign(
        {
          matchBase: true,
          dot: true
        },
        globOptions
      )
    )
    const fileList = files
      // We want to filter before resolving paths
      .filter(filter)
      // Return absolute path after the filter is run
      .map(file => path.resolve(resolveGitDir(gitDir), file))
    return {
      pattern,
      commands,
      fileList
    }
  })
}
