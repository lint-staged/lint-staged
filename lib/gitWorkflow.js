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
   * Leves stages files in index for running tasks
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

    // Get stash of entire original state, including unstaged changes
    // Keep index so that tasks only work on those files
    await this.execGit(['stash', 'save', '--quiet', '--include-untracked', '--keep-index', STASH])
    // Since only staged files are now present, get a diff of unstaged changes
    // by comparing current index against original stash, but in reverse
    const original = await this.getBackupStash()
    this.unstagedDiff = await this.execGit([
      'diff',
      '--unified=0',
      '--no-color',
      '--no-ext-diff',
      '-p',
      original,
      '-R'
    ])
    debug('Done backing up original state!')
  }

  /**
   * Resets everything and applies back unstaged and staged changes,
   * possibly with modifications by tasks
   *
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async restoreUnstagedChanges() {
    debug('Restoring unstaged changes...')
    if (this.unstagedDiff) {
      try {
        await this.execGit(gitApplyArgs, { input: `${this.unstagedDiff}\n` })
      } catch (error) {
        debug('Error when restoring changes:')
        debug(error)
        debug('Retrying with 3-way merge')
        // Retry with `--3way` if normal apply fails
        await this.execGit([...gitApplyArgs, '--3way'], { input: `${this.unstagedDiff}\n` })
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
