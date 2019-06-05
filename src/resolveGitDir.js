'use strict'

const execGit = require('./execGit')
const path = require('path')
const printErrors = require('./printErrors')

module.exports = async function resolveGitDir() {
  try {
    const gitDir = await execGit(['rev-parse', '--show-toplevel'])
    return path.normalize(gitDir)
  } catch (error) {
    printErrors(error)
    return null
  }
}
