'use strict'

const debug = require('debug')('lint-staged:git')

const execGit = require('./execGit')

async function saveStagedFiles(options) {
  debug('Saving modified files...')
  // Stash changed changes
  await execGit(['stash', 'save', 'temporary lint-staged stash'], options)

  // Restore changed files back
  await execGit(['stash', 'apply', '--index'], options)

  debug('Done saving modified files!')
}

async function restoreStagedFiles(options) {
  debug('Restoring modified files...')

  // Reset everything to clear out modifications by linters
  await execGit(['reset', '--hard'], options)

  // Restore changed files back
  await execGit(['stash', 'apply', '--index'], options)

  debug('Done restoring modified files!')
}

async function clearStagedFileStash(options) {
  debug('Clearing saved modified files...')
  await execGit(['stash', 'drop'], options)
  debug('Done clearing saved modified files!')
}

module.exports = {
  execGit,
  saveStagedFiles,
  restoreStagedFiles,
  clearStagedFileStash
}
