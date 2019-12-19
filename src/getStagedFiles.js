'use strict'

const execGit = require('./execGit')

module.exports = async function getStagedFiles(options) {
  try {
    const lines = await execGit(
      options.all
        ? ['ls-tree', '-r', 'HEAD', '--name-only']
        : ['diff', '--staged', '--diff-filter=ACMR', '--name-only'],
      options
    )
    return lines ? lines.split('\n') : []
  } catch (error) {
    return null
  }
}
