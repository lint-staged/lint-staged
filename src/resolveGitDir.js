'use strict'

const execGit = require('./execGit')
const path = require('path')

module.exports = async function resolveGitDir(options) {
  try {
    const gitDir = await execGit(['rev-parse', '--show-toplevel'], options)
    return path.normalize(gitDir)
  } catch (error) {
    return null
  }
}
