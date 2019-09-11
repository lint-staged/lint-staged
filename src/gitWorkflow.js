'use strict'

const debug = require('debug')('lint-staged:git')
const fs = require('fs')
const path = require('path')

const execGit = require('./execGit')

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
  }

  /**
   * Read file from .git directory, returning a buffer or null
   * @param {String} filename Relative path to file
   * @returns {Promise<Buffer|Null>}
   */
  readGitConfigFile(filename) {
    const resolvedPath = path.resolve(this.cwd, '.git', filename)
    return new Promise(resolve => {
      fs.readFile(resolvedPath, (error, file) => {
        resolve(error && error.code === 'ENOENT' ? null : file)
      })
    })
  }

  /**
   * Write buffer to relative .git directory
   * @param {String} filename Relative path to file
   * @param {Buffer} buffer
   */
  writeGitConfigFile(filename, buffer) {
    const resolvedPath = path.resolve(this.cwd, '.git', filename)
    return new Promise(resolve => {
      fs.writeFile(resolvedPath, buffer, resolve)
    })
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
    const mergeHead = await this.readGitConfigFile(MERGE_HEAD)
    if (mergeHead) {
      debug('Detected current merge mode!')
      debug('Backing up merge state...')
      this.mergeHead = mergeHead
      await Promise.all([
        this.readGitConfigFile(MERGE_MODE).then(mergeMode => (this.mergeMode = mergeMode)),
        this.readGitConfigFile(MERGE_MSG).then(mergeMsg => (this.mergeMsg = mergeMsg))
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

    if (this.mergeHead) {
      debug('Detected backup merge state!')
      debug('Restoring merge state...')
      const writePromises = [this.writeGitConfigFile(MERGE_HEAD, this.mergeHead)]
      if (this.mergeMode) writePromises.push(this.writeGitConfigFile(MERGE_MODE, this.mergeMode))
      if (this.mergeMsg) writePromises.push(this.writeGitConfigFile(MERGE_MSG, this.mergeMsg))
      await Promise.all(writePromises)
      debug('Done restoring merge state!')
    }
  }
}

module.exports = GitWorkflow
