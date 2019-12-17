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
    await execGit(['clean', '--force', ...untrackedFiles.split('\n')])
  }
}

const handleGitLockError = (error, ctx) => {
  if (error.message.includes('Another git process seems to be running in this repository')) {
    ctx.hasErrors = true
    ctx.hasGitLockError = true
  }
  throw error
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
    this.mergeHeadFilename = path.resolve(this.gitDir, '.git', MERGE_HEAD)
    this.mergeModeFilename = path.resolve(this.gitDir, '.git', MERGE_MODE)
    this.mergeMsgFilename = path.resolve(this.gitDir, '.git', MERGE_MSG)
  }

  /**
   * Get name of backup stash
   */
  async getBackupStash() {
    const stashes = await this.execGit(['stash', 'list'])
    const index = stashes.split('\n').findIndex(line => line.includes(STASH))
    return `stash@{${index}}`
  }

  /**
   * Save meta information about ongoing git merge
   */
  async backupMergeStatus() {
    debug('Detected current merge mode!')
    debug('Backing up merge state...')
    await Promise.all([
      readBufferFromFile(this.mergeHeadFilename).then(buffer => (this.mergeHeadBuffer = buffer)),
      readBufferFromFile(this.mergeModeFilename).then(buffer => (this.mergeModeBuffer = buffer)),
      readBufferFromFile(this.mergeMsgFilename).then(buffer => (this.mergeMsgBuffer = buffer))
    ])
    debug('Done backing up merge state!')
  }

  /**
   * Restore meta information about ongoing git merge
   */
  async restoreMergeStatus() {
    debug('Detected backup merge state!')
    debug('Restoring merge state...')
    await Promise.all([
      writeBufferToFile(this.mergeHeadFilename, this.mergeHeadBuffer),
      writeBufferToFile(this.mergeModeFilename, this.mergeModeBuffer),
      writeBufferToFile(this.mergeMsgFilename, this.mergeMsgBuffer)
    ])
    debug('Done restoring merge state!')
  }

  /**
   * Create backup stashes, one of everything and one of only staged changes
   * Staged files are left in the index for running tasks
   */
  async stashBackup() {
    debug('Backing up original state...')

    // the `git stash` clears metadata about a possible git merge
    // Manually check and backup if necessary
    if (await checkFile(this.mergeHeadFilename)) {
      await this.backupMergeStatus()
    }

    // Save stash of entire original state, including unstaged and untracked changes.
    // `--keep-index leaves only staged files on disk, for tasks.`
    await this.execGit(['stash', 'save', '--quiet', '--include-untracked', '--keep-index', STASH])

    // Restore meta information about ongoing git merge
    if (this.mergeHeadBuffer) {
      await this.restoreMergeStatus()
    }

    // There is a bug in git =< 2.13.0 where `--keep-index` resurrects deleted files.
    // These files should be listed and deleted before proceeding.
    await cleanUntrackedFiles(this.execGit)

    // Get a diff of unstaged changes by diffing the saved stash against what's left on disk.
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
   */
  async applyModifications(ctx) {
    let modifiedFiles = await this.execGit(['ls-files', '--modified'])
    if (modifiedFiles) {
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
          ctx.hasErrors = true
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
   */
  async restoreOriginalState(ctx) {
    try {
      debug('Restoring original state...')
      const backupStash = await this.getBackupStash()
      await this.execGit(['reset', '--hard', 'HEAD'])
      await this.execGit(['stash', 'apply', '--quiet', '--index', backupStash])
      debug('Done restoring original state!')

      // Restore meta information about ongoing git merge
      if (this.mergeHeadBuffer) {
        await this.restoreMergeStatus()
      }
    } catch (error) {
      handleGitLockError(error, ctx)
    }
  }

  /**
   * Drop the created stashes after everything has run
   */
  async dropBackup() {
    debug('Dropping backup stash...')
    const backupStash = await this.getBackupStash()
    await this.execGit(['stash', 'drop', '--quiet', backupStash])
    debug('Done dropping backup stash!')
  }
}

module.exports = GitWorkflow
module.exports.cleanUntrackedFiles = cleanUntrackedFiles
