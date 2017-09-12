'use strict'

const map = require('lodash/map')
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
    // We need to concatenate `includes` patterns with negated patterns in
    // `excludes`. We expect `includes` to be present. But `exludes` might not
    // be. So we use `lodash/map` which handles this edge case.
    const patterns = linter.includes.concat(
      // `map(undefined, i => `!${i}`)` ➡ `[]`.
      map(linter.excludes, pattern => `!${pattern}`)
    )
    const commands = linter.commands
    const fileList =
      // We want to filter before resolving paths
      mm(files, patterns, globOptions)
        // Return absolute path after the filter is run
        .map(file => path.resolve(resolvedGitDir, file))
    return {
      title: patterns.join(', '),
      commands,
      fileList
    }
  })
}
