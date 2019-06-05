'use strict'

const execGit = require('./execGit')
const printErrors = require('./printErrors')

module.exports = async function resolveGitDir() {
  try {
    const gitDir = await execGit(['rev-parse', '--show-toplevel'])
    return gitDir
  } catch (error) {
    printErrors(error)
    return null
  }
}
