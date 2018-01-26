'use strict'

const path = require('path')
const minimatch = require('minimatch')
const pathIsInside = require('path-is-inside')
const getConfig = require('./getConfig').getConfig
const resolveGitDir = require('./resolveGitDir')

const debug = require('debug')('lint-staged:gen-tasks')

module.exports = function generateTasks(config, relFiles) {
  debug('Generating linter tasks')

  const normalizedConfig = getConfig(config) // Ensure we have a normalized config
  const linters = normalizedConfig.linters
  const globOptions = normalizedConfig.globOptions
  const ignoreFilters = normalizedConfig.ignore.map(pattern => minimatch.filter(pattern))
  // if there are filters, then return false if the input matches any
  // if there are not, then return true for all input
  const ignoreFilter = ignoreFilters.length
    ? input => !ignoreFilters.some(filter => filter(input))
    : () => true

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
      .filter(ignoreFilter)
      // Return absolute path after the filter is run
      .map(file => path.resolve(cwd, file))

    const task = { pattern, commands, fileList }
    debug('Generated task: \n%O', task)

    return task
  })
}
