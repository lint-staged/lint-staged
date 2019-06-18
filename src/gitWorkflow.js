'use strict'

const debug = require('debug')('lint-staged:git')

const execGit = require('./execGit')

async function hasPartiallyStagedFiles(options) {
  const stdout = await execGit(['status', '--porcelain'], options)
  if (!stdout) return false

  const changedFiles = stdout.split('\n')
  const partiallyStaged = changedFiles.filter(line => {
    /**
     * See https://git-scm.com/docs/git-status#_short_format
     * The first letter of the line represents current index status,
     * and second the working tree
     */
    const [index, workingTree] = line
    return index !== ' ' && workingTree !== ' ' && index !== '?' && workingTree !== '?'
  })

  return partiallyStaged.length > 0
}

async function saveStagedFiles(options) {
  debug('Saving modified files...')
  // Stash changed changes
  await execGit(['stash', 'push', '-m temporary lint-staged stash'], options)

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
  hasPartiallyStagedFiles,
  saveStagedFiles,
  restoreStagedFiles,
  clearStagedFileStash
}
