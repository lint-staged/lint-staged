'use strict'

const debug = require('debug')('lint-staged:git')
const path = require('path')

const execGit = require('./execGit')
const { exists, readFile, unlink, writeFile } = require('./file')

const MERGE_HEAD = 'MERGE_HEAD'
const MERGE_MODE = 'MERGE_MODE'
const MERGE_MSG = 'MERGE_MSG'

const STASH = 'lint-staged automatic backup'

const PATCH_UNSTAGED = 'lint-staged_unstaged.patch'
const PATCH_UNTRACKED = 'lint-staged_untracked.patch'

const GIT_APPLY_ARGS = ['apply', '-v', '--whitespace=nowarn', '--recount', '--unidiff-zero']
const GIT_DIFF_ARGS = ['--binary', '--unified=0', '--no-color', '--no-ext-diff', '--patch']

const handleError = (error, ctx) => {
  ctx.gitError = true
  throw error
}

class GitWorkflow {
  constructor({ allowEmpty, gitConfigDir, gitDir, stagedFileChunks }) {
    this.execGit = (args, options = {}) => execGit(args, { ...options, cwd: gitDir })
    this.gitConfigDir = gitConfigDir
    this.gitDir = gitDir
    this.unstagedDiff = null
    this.allowEmpty = allowEmpty
    this.stagedFileChunks = stagedFileChunks

    /**
     * These three files hold state about an ongoing git merge
     * Resolve paths during constructor
     */
    this.mergeHeadFilename = path.resolve(gitConfigDir, MERGE_HEAD)
    this.mergeModeFilename = path.resolve(gitConfigDir, MERGE_MODE)
    this.mergeMsgFilename = path.resolve(gitConfigDir, MERGE_MSG)
  }

  /**
   * Get absolute path to file hidden inside .git
   * @param {string} filename
   */
  getHiddenFilepath(filename) {
    return path.resolve(this.gitConfigDir, `./${filename}`)
  }

  /**
   * Check if patch file exists and has content.
   * @param {string} filename
   */
  async hasPatch(filename) {
    const resolved = this.getHiddenFilepath(filename)
    const pathIfExists = await exists(resolved)
    if (!pathIfExists) return false
    const buffer = await readFile(pathIfExists)
    const patch = buffer.toString().trim()
    return patch.length ? filename : false
  }

  /**
   * Get name of backup stash
   */
  async getBackupStash(ctx) {
    const stashes = await this.execGit(['stash', 'list'])
    const index = stashes.split('\n').findIndex(line => line.includes(STASH))
    if (index === -1) {
      ctx.gitGetBackupStashError = true
      throw new Error('lint-staged automatic backup is missing!')
    }
    return `stash@{${index}}`
  }

  /**
   * Save meta information about ongoing git merge
   */
  async backupMergeStatus() {
    debug('Backing up merge state...')
    await Promise.all([
      readFile(this.mergeHeadFilename).then(buffer => (this.mergeHeadBuffer = buffer)),
      readFile(this.mergeModeFilename).then(buffer => (this.mergeModeBuffer = buffer)),
      readFile(this.mergeMsgFilename).then(buffer => (this.mergeMsgBuffer = buffer))
    ])
    debug('Done backing up merge state!')
  }

  /**
   * Restore meta information about ongoing git merge
   */
  async restoreMergeStatus() {
    debug('Restoring merge state...')
    try {
      await Promise.all([
        this.mergeHeadBuffer && writeFile(this.mergeHeadFilename, this.mergeHeadBuffer),
        this.mergeModeBuffer && writeFile(this.mergeModeFilename, this.mergeModeBuffer),
        this.mergeMsgBuffer && writeFile(this.mergeMsgFilename, this.mergeMsgBuffer)
      ])
      debug('Done restoring merge state!')
    } catch (error) {
      debug('Failed restoring merge state with error:')
      debug(error)
      throw new Error('Merge state could not be restored due to an error!')
    }
  }

  /**
   * List and delete untracked files
   */
  async cleanUntrackedFiles() {
    const lsFiles = await this.execGit(['ls-files', '--others', '--exclude-standard'])
    const untrackedFiles = lsFiles
      .split('\n')
      .filter(Boolean)
      .map(file => path.resolve(this.gitDir, file))
    await Promise.all(untrackedFiles.map(file => unlink(file)))
  }

  /**
   * Create backup stashes, one of everything and one of only staged changes
   * Staged files are left in the index for running tasks
   */
  async stashBackup(ctx) {
    try {
      debug('Backing up original state...')

      // the `git stash` clears metadata about a possible git merge
      // Manually check and backup if necessary
      await this.backupMergeStatus()

      // Get a list of unstaged deleted files, because certain bugs might cause them to reappear:
      // - in git versions =< 2.13.0 the `--keep-index` flag resurrects deleted files
      // - git stash can't infer RD or MD states correctly, and will lose the deletion
      this.deletedFiles = (await this.execGit(['ls-files', '--deleted']))
        .split('\n')
        .filter(Boolean)
        .map(file => path.resolve(this.gitDir, file))

      // Save stash of entire original state, including unstaged and untracked changes.
      // `--keep-index leaves only staged files on disk, for tasks.`
      await this.execGit(['stash', 'save', '--include-untracked', '--keep-index', STASH])

      // Restore meta information about ongoing git merge
      await this.restoreMergeStatus()

      // There is a bug in git =< 2.13.0 where `--keep-index` resurrects deleted files.
      // These files should be listed and deleted before proceeding.
      await this.cleanUntrackedFiles()

      // Get a diff of unstaged changes by diffing the saved stash against what's left on disk.
      await this.execGit([
        'diff',
        ...GIT_DIFF_ARGS,
        `--output=${this.getHiddenFilepath(PATCH_UNSTAGED)}`,
        await this.getBackupStash(ctx),
        '-R' // Show diff in reverse
      ])

      debug('Done backing up original state!')
    } catch (error) {
      if (error.message && error.message.includes('You do not have the initial commit yet')) {
        ctx.emptyGitRepo = true
      }
      handleError(error, ctx)
    }
  }

  /**
   * Applies back task modifications, and unstaged changes hidden in the stash.
   * In case of a merge-conflict retry with 3-way merge.
   */
  async applyModifications(ctx) {
    const modifiedFiles = await this.execGit(['ls-files', '--modified'])
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

    const modifiedFilesAfterAdd = await this.execGit(['status', '--porcelain'])
    if (!modifiedFilesAfterAdd && !this.allowEmpty) {
      // Tasks reverted all staged changes and the commit would be empty
      // Throw error to stop commit unless `--allow-empty` was used
      ctx.gitApplyEmptyCommit = true
      handleError(new Error('Prevented an empty git commit!'), ctx)
    }

    // Restore unstaged changes by applying the diff back. If it at first fails,
    // this is probably because of conflicts between task modifications.
    // 3-way merge usually fixes this, and in case it doesn't we should just give up and throw.
    if (await this.hasPatch(PATCH_UNSTAGED)) {
      debug('Restoring unstaged changes...')
      const unstagedPatch = this.getHiddenFilepath(PATCH_UNSTAGED)
      try {
        await this.execGit([...GIT_APPLY_ARGS, unstagedPatch])
      } catch (error) {
        debug('Error while restoring changes:')
        debug(error)
        debug('Retrying with 3-way merge')

        try {
          // Retry with `--3way` if normal apply fails
          await this.execGit([...GIT_APPLY_ARGS, '--3way', unstagedPatch])
        } catch (error2) {
          debug('Error while restoring unstaged changes using 3-way merge:')
          debug(error2)
          ctx.gitApplyModificationsError = true
          handleError(
            new Error('Unstaged changes could not be restored due to a merge conflict!'),
            ctx
          )
        }
      }
      debug('Done restoring unstaged changes!')
    }

    // Restore untracked files by reading from the third commit associated with the backup stash
    // See https://stackoverflow.com/a/52357762
    try {
      const backupStash = await this.getBackupStash(ctx)
      const untrackedPatch = this.getHiddenFilepath(PATCH_UNTRACKED)
      await this.execGit([
        'show',
        ...GIT_DIFF_ARGS,
        '--format=%b',
        `--output=${untrackedPatch}`,
        `${backupStash}^3`
      ])
      if (await this.hasPatch(PATCH_UNTRACKED)) {
        await this.execGit([...GIT_APPLY_ARGS, untrackedPatch])
      }
    } catch (error) {
      ctx.gitRestoreUntrackedError = true
      handleError(error, ctx)
    }

    // If stashing resurrected deleted files, clean them out
    await Promise.all(this.deletedFiles.map(file => unlink(file)))
  }

  /**
   * Restore original HEAD state in case of errors
   */
  async restoreOriginalState(ctx) {
    try {
      debug('Restoring original state...')
      const backupStash = await this.getBackupStash(ctx)
      await this.execGit(['reset', '--hard', 'HEAD'])
      await this.execGit(['stash', 'apply', '--quiet', '--index', backupStash])
      debug('Done restoring original state!')

      // If stashing resurrected deleted files, clean them out
      await Promise.all(this.deletedFiles.map(file => unlink(file)))

      // Restore meta information about ongoing git merge
      await this.restoreMergeStatus()
    } catch (error) {
      ctx.gitRestoreOriginalStateError = true
      handleError(error, ctx)
    }
  }

  /**
   * Drop the created stashes after everything has run
   */
  async dropBackup(ctx) {
    try {
      debug('Dropping backup stash...')
      await Promise.all([
        exists(this.getHiddenFilepath(PATCH_UNSTAGED)).then(unlink),
        exists(this.getHiddenFilepath(PATCH_UNTRACKED)).then(unlink)
      ])
      const backupStash = await this.getBackupStash(ctx)
      await this.execGit(['stash', 'drop', '--quiet', backupStash])
      debug('Done dropping backup stash!')
    } catch (error) {
      handleError(error, ctx)
    }
  }
}

module.exports = GitWorkflow
