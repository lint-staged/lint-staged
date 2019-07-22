'use strict'

const debug = require('debug')('lint-staged:git')

const execGit = require('./execGit')

const STASH = 'lint-staged automatic backup'

let unstagedDiff = null

/**
 * Get name of backup stash
 *
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
async function getBackupStash(options) {
  const stashes = await execGit(['stash', 'list'], options)
  const index = stashes.split('\n').findIndex(line => line.includes(STASH))
  return `stash@{${index}}`
}

/**
 * Create backup stashes, one of everything and one of only staged changes
 * Leves stages files in index for running tasks
 *
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
async function stashBackup(options) {
  debug('Backing up original state...')

  // Get stash of entire original state, including unstaged changes
  // Keep index so that tasks only work on those files
  await execGit(['stash', 'save', '--quiet', '--include-untracked', '--keep-index', STASH], options)

  // Since only staged files are now present, get a diff of unstaged changes
  // by comparing current index against original stash, but in reverse
  const original = await getBackupStash(options)
  unstagedDiff = await execGit(
    ['diff', '--unified=0', '--no-color', '--no-ext-diff', '-p', original, '-R'],
    options
  )

  debug('Done backing up original state!')
}

const gitApplyArgs = ['apply', '-v', '--whitespace=nowarn', '--recount', '--unidiff-zero']

/**
 * Resets everything and applies back unstaged and staged changes,
 * possibly with modifications by tasks
 *
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
async function restoreUnstagedChanges(options) {
  debug('Restoring unstaged changes...')

  if (unstagedDiff) {
    try {
      await execGit(gitApplyArgs, { ...options, input: `${unstagedDiff}\n` })
    } catch (error) {
      debug('Error when restoring changes:')
      debug(error)
      debug('Retrying with 3-way merge')
      // Retry with `--3way` if normal apply fails
      await execGit([...gitApplyArgs, '--3way'], { ...options, input: `${unstagedDiff}\n` })
    }
  }

  debug('Done restoring unstaged changes!')
}

/**
 * Restore original HEAD state in case of errors
 *
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
async function restoreOriginalState(options) {
  debug('Restoring original state...')
  const original = await getBackupStash(options)
  await execGit(['reset', '--hard', 'HEAD'], options)
  await execGit(['stash', 'apply', '--quiet', '--index', original], options)
  debug('Done restoring original state!')
}

/**
 * Drop the created stashes after everything has run
 *
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
async function dropBackup(options) {
  debug('Dropping backup stash...')
  const original = await getBackupStash(options)
  await execGit(['stash', 'drop', '--quiet', original], options)
  unstagedDiff = null
  debug('Done dropping backup stash!')
}

module.exports = {
  execGit,
  stashBackup,
  restoreUnstagedChanges,
  restoreOriginalState,
  dropBackup
}
