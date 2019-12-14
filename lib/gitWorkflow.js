'use strict'

const debug = require('debug')('lint-staged:git')
const path = require('path')

const execGit = require('./execGit')
const { checkFile, readBufferFromFile, writeBufferToFile } = require('./file')

const MERGE_HEAD = 'MERGE_HEAD'
const MERGE_MODE = 'MERGE_MODE'
const MERGE_MSG = 'MERGE_MSG'

const STASH = 'lint-staged automatic backup'

const gitApplyArgs = ['apply', '-v', '--whitespace=nowarn', '--recount', '--unidiff-zero']

/**
 * Delete untracked files using `git clean`
 * @param {Function} execGit function for executing git commands using execa
 * @returns {Promise<void>}
 */
const cleanUntrackedFiles = async execGit => {
  const untrackedFiles = await execGit(['ls-files', '--others', '--exclude-standard'])
  if (untrackedFiles) {
    debug('Detected unstaged, untracked files: ', untrackedFiles)
    debug(
      'This is probably due to a bug in git =< 2.13.0 where `git stash --keep-index` resurrects deleted files.'
    )
    debug('Deleting the files using `git clean`...')
    await execGit(['clean', '--force', untrackedFiles.split('\n').join(' ')])
  }
}

class GitWorkflow {
  constructor({ gitDir, stagedFileChunks }) {
    this.execGit = (args, options = {}) => execGit(args, { ...options, cwd: gitDir })
    this.unstagedDiff = null
    this.gitDir = gitDir
    this.stagedFileChunks = stagedFileChunks

    /**
     * These three files hold state about an ongoing git merge
     * Resolve paths during constructor
     */
    this.mergeHeadFile = path.resolve(this.gitDir, '.git', MERGE_HEAD)
    this.mergeModeFile = path.resolve(this.gitDir, '.git', MERGE_MODE)
    this.mergeMsgFile = path.resolve(this.gitDir, '.git', MERGE_MSG)
  }

  /**
   * Get name of backup stash
   *
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async getBackupStash() {
    const stashes = await this.execGit(['stash', 'list'])
    const index = stashes.split('\n').findIndex(line => line.includes(STASH))
    return `stash@{${index}}`
  }

  /**
   * Create backup stashes, one of everything and one of only staged changes
   * Staged files are left in the index for running tasks
   *
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async stashBackup() {
    debug('Backing up original state...')

    // Git stash loses metadata about a possible merge mode
    // Manually check and backup if necessary
    if (await checkFile(this.mergeHeadFile)) {
      debug('Detected current merge mode!')
      debug('Backing up merge state...')
      await Promise.all([
        readBufferFromFile(this.mergeHeadFile).then(
          mergeHead => (this.mergeHeadBuffer = mergeHead)
        ),
        readBufferFromFile(this.mergeModeFile).then(
          mergeMode => (this.mergeModeBuffer = mergeMode)
        ),
        readBufferFromFile(this.mergeMsgFile).then(mergeMsg => (this.mergeMsgBuffer = mergeMsg))
      ])
      debug('Done backing up merge state!')
    }

    // Save stash of entire original state, including unstaged and untracked changes.
    // `--keep-index leaves only staged files on disk, for tasks.`
    await this.execGit(['stash', 'save', '--quiet', '--include-untracked', '--keep-index', STASH])

    // There is a bug in git =< 2.13.0 where `--keep-index` resurrects deleted files.
    // These files should be listed and deleted before proceeding.
    await cleanUntrackedFiles(this.execGit)

    // Get a diff of unstaged changes by saved stash against what's left on disk.
    this.unstagedDiff = await this.execGit([
      'diff',
      '--binary',
      '--unified=0',
      '--no-color',
      '--no-ext-diff',
      '--patch',
      await this.getBackupStash(),
      '-R' // Show diff in reverse
    ])

    debug('Done backing up original state!')
  }

  /**
   * Applies back task modifications, and unstaged changes hidden in the stash.
   * In case of a merge-conflict retry with 3-way merge.
   *
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async applyModifications() {
    let modifiedFiles = await this.execGit(['ls-files', '--modified'])
    if (modifiedFiles) {
      modifiedFiles = modifiedFiles.split('\n')
      debug('Detected files modified by tasks:')
      debug(modifiedFiles)
      debug('Adding files to index...')
      await Promise.all(
        // stagedFileChunks includes staged files that lint-staged originally detected.
        // Add only these files so any 3rd-party edits to other files won't be included in the commit.
        this.stagedFileChunks.map(stagedFiles => this.execGit(['add', ...stagedFiles]))
      )
      debug('Done adding files to index!')
    }

    if (this.unstagedDiff) {
      debug('Restoring unstaged changes...')
      try {
        await this.execGit(gitApplyArgs, { input: `${this.unstagedDiff}\n` })
      } catch (error) {
        debug('Error while restoring changes:')
        debug(error)
        debug('Retrying with 3-way merge')

        try {
          // Retry with `--3way` if normal apply fails
          await this.execGit([...gitApplyArgs, '--3way'], { input: `${this.unstagedDiff}\n` })
        } catch (error2) {
          debug('Error while restoring unstaged changes using 3-way merge:')
          debug(error2)
          throw new Error('Unstaged changes could not be restored due to a merge conflict!')
        }
      }
      debug('Done restoring unstaged changes!')
    }

    // Restore untracked files by reading from the third commit associated with the backup stash
    // Git will return with error code if the commit doesn't exist
    // See https://stackoverflow.com/a/52357762
    try {
      const backupStash = await this.getBackupStash()
      const output = await this.execGit(['show', '--format=%b', `${backupStash}^3`])
      const untrackedDiff = output.replace(/^\n*/, '') // remove empty lines from start of output
      if (!untrackedDiff) return
      await this.execGit([...gitApplyArgs], { input: `${untrackedDiff}\n` })
    } catch (err) {} // eslint-disable-line no-empty
  }

  /**
   * Restore original HEAD state in case of errors
   *
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async restoreOriginalState() {
    debug('Restoring original state...')
    const original = await this.getBackupStash()
    await this.execGit(['reset', '--hard', 'HEAD'])
    await this.execGit(['stash', 'apply', '--quiet', '--index', original])
    debug('Done restoring original state!')
  }

  /**
   * Drop the created stashes after everything has run
   *
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async dropBackup() {
    debug('Dropping backup stash...')
    const original = await this.getBackupStash()
    await this.execGit(['stash', 'drop', '--quiet', original])
    debug('Done dropping backup stash!')

    if (this.mergeHeadBuffer) {
      debug('Detected backup merge state!')
      debug('Restoring merge state...')
      await Promise.all([
        writeBufferToFile(this.mergeHeadFile, this.mergeHeadBuffer),
        writeBufferToFile(this.mergeModeFile, this.mergeModeBuffer),
        writeBufferToFile(this.mergeMsgFile, this.mergeMsgBuffer)
      ])
      debug('Done restoring merge state!')
    }
  }
}

module.exports = GitWorkflow
module.exports.cleanUntrackedFiles = cleanUntrackedFiles
