'use strict'

const debug = require('debug')('lint-staged:git')

const execGit = require('./execGit')

const STASH_ORGINAL = 'lint-staged backup (original state)'
const STASH_MODIFICATIONS = 'lint-staged backup (modifications)'

let unstagedDiff

/**
 * From `array` of strings find index number of string containing `test` string
 *
 * @param {Array<string>} array - Array of strings
 * @param {string} test - Test string
 * @returns {number} - Index number
 */
const findIndex = (array, test) => array.findIndex(line => line.includes(test))

/**
 * Get names of stashes
 *
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
async function getStashes(options) {
  const stashList = (await execGit(['stash', 'list'], options)).split('\n')
  return {
    original: `stash@{${findIndex(stashList, STASH_ORGINAL)}}`,
    modifications: `stash@{${findIndex(stashList, STASH_MODIFICATIONS)}}`
  }
}

/**
 * Create backup stashes, one of everything and one of only staged changes
 * Leves stages files in index for running tasks
 *
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
async function backupOriginalState(options) {
  debug('Backing up original state...')

  // Get stash of entire original state, including unstaged changes
  // Keep index so that tasks only work on those files
  await execGit(['stash', 'save', '--include-untracked', '--keep-index', STASH_ORGINAL], options)

  // Since only staged files are now present, get a diff of unstaged changes
  // by comparing current index against original stash, but in reverse
  const { original } = await getStashes(options)
  unstagedDiff = await execGit(
    ['diff', '--unified=0', '--no-color', '--no-ext-diff', '-p', original, '-R'],
    options
  )

  debug('Done backing up original state!')
}

/**
 * Resets everything and applies back unstaged and staged changes,
 * possibly with modifications by tasks
 *
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
async function applyModifications(options) {
  debug('Applying modifications by tasks...')

  // Save index with possible modifications by tasks.
  await execGit(['stash', 'save', STASH_MODIFICATIONS], options)
  // Reset HEAD
  await execGit(['reset'], options)
  await execGit(['checkout', '.'], options)

  // Get diff of index against reseted HEAD, this includes all staged changes,
  // with possible changes by tasks
  const { modifications } = await getStashes(options)
  const stagedDiff = await execGit(
    ['diff', '--unified=0', '--no-color', '--no-ext-diff', 'HEAD', '-p', modifications],
    options
  )

  await execGit(['apply', '-v', '--index', '--whitespace=nowarn', '--recount', '--unidiff-zero'], {
    ...options,
    input: `${stagedDiff}\n`
  })

  if (unstagedDiff) {
    await execGit(['apply', '-v', '--whitespace=nowarn', '--recount', '--unidiff-zero'], {
      ...options,
      input: `${unstagedDiff}\n`
    })
  }

  debug('Done applying modifications by tasks!')
}

/**
 * Restore original HEAD state in case of errors
 *
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
async function restoreOriginalState(options) {
  debug('Restoring original state...')
  const { original } = await getStashes(options)
  await execGit(['reset', '--hard', 'HEAD'], options)
  await execGit(['stash', 'apply', '--index', original], options)
  debug('Done restoring original state!')
}

/**
 * Drop the created stashes after everything has run
 *
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
async function dropBackupStashes(options) {
  debug('Dropping backup stash...')
  const { original, modifications } = await getStashes(options)
  await execGit(['stash', 'drop', original], options)
  await execGit(['stash', 'drop', modifications], options)
  debug('Done dropping backup stash!')
}

module.exports = {
  execGit,
  backupOriginalState,
  applyModifications,
  restoreOriginalState,
  dropBackupStashes
}
