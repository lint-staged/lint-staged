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

class GitWorkflow {
  constructor(cwd) {
    this.execGit = (args, options = {}) => execGit(args, { ...options, cwd })
    this.unstagedDiff = null
    this.cwd = cwd

    /**
     * These three files hold state about an ongoing git merge
     * Resolve paths during constructor
     */
    this.mergeHeadFile = path.resolve(this.cwd, '.git', MERGE_HEAD)
    this.mergeModeFile = path.resolve(this.cwd, '.git', MERGE_MODE)
    this.mergeMsgFile = path.resolve(this.cwd, '.git', MERGE_MSG)
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
    // This should remove all changes from the index.
    // The `--keep-index` option cannot be used since it resurrects deleted files on
    // git versions before v2.23.0 (https://github.com/git/git/blob/master/Documentation/RelNotes/2.23.0.txt#L322)
    await this.execGit(['stash', 'save', '--quiet', '--include-untracked', STASH])
    // Apply only the staged changes back to index
    await this.execGit(['stash', 'apply', '--index', await this.getBackupStash()])
    // Checkout everything just in case there are unstaged files left behind.
    await this.execGit(['checkout', '.'])
    // Since only staged files are now present, get a diff of unstaged changes
    // by comparing current index against original stash, but in reverse
    this.unstagedDiff = await this.execGit([
      'diff',
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
      await this.execGit(['add', '.'])
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
