'use strict'

const debug = require('debug')('lint-staged:git')
const path = require('path')

const execGit = require('./execGit')
const {
  GitError,
  ApplyEmptyCommitError,
  HideUnstagedChangesError,
  RestoreOriginalStateError,
  RestoreUnstagedChangesError,
} = require('./symbols')
const unlink = require('./unlink')

const MERGE_HEAD = 'MERGE_HEAD'
const MERGE_MODE = 'MERGE_MODE'
const MERGE_MSG = 'MERGE_MSG'

// In git status machine output, renames are presented as `to`NUL`from`
// When diffing, both need to be taken into account, but in some cases on the `to`.
// eslint-disable-next-line no-control-regex
const RENAME = /\x00/

/**
 * From list of files, split renames and flatten into two files `to`NUL`from`.
 * @param {string[]} files
 * @param {Boolean} [includeRenameFrom=true] Whether or not to include the `from` renamed file, which is no longer on disk
 */
const processRenames = (files, includeRenameFrom = true) =>
  files.reduce((flattened, file) => {
    if (RENAME.test(file)) {
      const [to, from] = file.split(RENAME)
      if (includeRenameFrom) flattened.push(from)
      flattened.push(to)
    } else {
      flattened.push(file)
    }
    return flattened
  }, [])

const PATCH_UNSTAGED = 'lint-staged_unstaged.patch'
const PATCH_PARTIAL = 'lint-staged_partial.patch'

const GIT_DIFF_ARGS = [
  '--binary', // support binary files
  '--unified=0', // do not add lines around diff for consistent behaviour
  '--no-color', // disable colors for consistent behaviour
  '--no-ext-diff', // disable external diff tools for consistent behaviour
  '--src-prefix=a/', // force prefix for consistent behaviour
  '--dst-prefix=b/', // force prefix for consistent behaviour
  '--patch', // output a patch that can be applied
  '--submodule=short', // always use the default short format for submodules
]
const GIT_APPLY_ARGS = ['-v', '--whitespace=nowarn', '--recount', '--unidiff-zero']

const handleError = (error, ctx, symbol) => {
  ctx.errors.add(GitError)
  if (symbol) ctx.errors.add(symbol)
  throw error
}

class GitWorkflow {
  constructor({ allowEmpty, gitConfigDir, gitDir, matchedFileChunks }) {
    this.execGit = (args, options = {}) => execGit(args, { ...options, cwd: gitDir })
    this.deletedFiles = []
    this.gitConfigDir = gitConfigDir
    this.gitDir = gitDir
    this.unstagedDiff = null
    this.allowEmpty = allowEmpty
    this.matchedFileChunks = matchedFileChunks

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
   * Get a list of all files with both staged and unstaged modifications.
   * Renames have special treatment, since the single status line includes
   * both the "from" and "to" filenames, where "from" is no longer on disk.
   */
  async getPartiallyStagedFiles() {
    debug('Getting partially staged files...')
    const status = await this.execGit(['status', '-z'])
    /**
     * See https://git-scm.com/docs/git-status#_short_format
     * Entries returned in machine format are separated by a NUL character.
     * The first letter of each entry represents current index status,
     * and second the working tree. Index and working tree status codes are
     * separated from the file name by a space. If an entry includes a
     * renamed file, the file names are separated by a NUL character
     * (e.g. `to`\0`from`)
     */
    const partiallyStaged = status
      // eslint-disable-next-line no-control-regex
      .split(/\x00(?=[ AMDRCU?!]{2} |$)/)
      .filter((line) => {
        const [index, workingTree] = line
        return index !== ' ' && workingTree !== ' ' && index !== '?' && workingTree !== '?'
      })
      .map((line) => line.substr(3)) // Remove first three letters (index, workingTree, and a whitespace)
      .filter(Boolean) // Filter empty string
    debug('Found partially staged files:', partiallyStaged)
    return partiallyStaged.length ? partiallyStaged : null
  }

  /**
   * Create a diff of partially staged files.
   */
  async prepare(ctx) {
    try {
      debug('Backing up original state...')

      const unstagedPatch = this.getHiddenFilepath(PATCH_UNSTAGED)
      await this.execGit(['diff', ...GIT_DIFF_ARGS, '--output', unstagedPatch])

      // Get a list of files with bot staged and unstaged changes.
      // Unstaged changes to these files should be hidden before the tasks run.
      this.partiallyStagedFiles = await this.getPartiallyStagedFiles()

      if (this.partiallyStagedFiles) {
        ctx.hasPartiallyStagedFiles = true
        const partialPatch = this.getHiddenFilepath(PATCH_PARTIAL)
        const files = processRenames(this.partiallyStagedFiles)
        await this.execGit(['diff', ...GIT_DIFF_ARGS, '--output', partialPatch, '--', ...files])
      } else {
        ctx.hasPartiallyStagedFiles = false
      }

      debug('Done backing up original state!')
    } catch (error) {
      handleError(error, ctx)
    }
  }

  /**
   * Remove unstaged changes to all partially staged files, to avoid tasks from seeing them
   */
  async hideUnstagedChanges(ctx) {
    try {
      const files = processRenames(this.partiallyStagedFiles, false)
      await this.execGit(['checkout', '--force', '--', ...files])
    } catch (error) {
      /**
       * `git checkout --force` doesn't throw errors, so it shouldn't be possible to get here.
       * If this does fail, the handleError method will set ctx.gitError and lint-staged will fail.
       */
      handleError(error, ctx, HideUnstagedChangesError)
    }
  }

  /** Add all task modifications to index for files that were staged before running. */
  async applyModifications(ctx) {
    debug('Adding task modifications to index...')

    if (ctx.hasInitialCommit) {
      const stagedFilesAfterAdd = await this.execGit(['diff', 'HEAD'])
      if (!stagedFilesAfterAdd && !this.allowEmpty) {
        // Tasks reverted all staged changes and the commit would be empty
        // Throw error to stop commit unless `--allow-empty` was used
        handleError(new Error('Prevented an empty git commit!'), ctx, ApplyEmptyCommitError)
      }
    }

    // `matchedFileChunks` includes staged files that lint-staged originally detected and matched against a task.
    // Add only these files so any 3rd-party edits to other files won't be included in the commit.
    // These additions per chunk are run "serially" to prevent race conditions.
    // Git add creates a lockfile in the repo causing concurrent operations to fail.
    for (const files of this.matchedFileChunks) {
      await this.execGit(['add', '--', ...files])
    }

    debug('Done adding task modifications to index!')
  }

  /**
   * Restore original HEAD state in case of errors
   */
  async restoreOriginalState(ctx) {
    try {
      debug('Restoring original state...')
      await this.execGit(['checkout', '--force', '--', '.'])

      const unstagedPatch = this.getHiddenFilepath(PATCH_UNSTAGED)
      await this.execGit(['apply', ...GIT_APPLY_ARGS, unstagedPatch])

      debug('Done restoring original state!')
    } catch (error) {
      handleError(error, ctx, RestoreOriginalStateError)
    }
  }

  /**
   * Restore unstaged changes to partially changed files. If it at first fails,
   * this is probably because of conflicts between new task modifications.
   * 3-way merge usually fixes this, and in case it doesn't we should just give up and throw.
   */
  async restorePartialChanges(ctx) {
    debug('Restoring unstaged changes...')
    const partialPatch = this.getHiddenFilepath(PATCH_PARTIAL)
    try {
      await this.execGit(['apply', ...GIT_APPLY_ARGS, partialPatch])
    } catch (applyError) {
      debug('Error while restoring changes:')
      debug(applyError)
      debug('Retrying with 3-way merge')
      try {
        // Retry with a 3-way merge if normal apply fails
        await this.execGit(['apply', ...GIT_APPLY_ARGS, '--3way', partialPatch])
      } catch (threeWayApplyError) {
        debug('Error while restoring unstaged changes using 3-way merge:')
        debug(threeWayApplyError)
        handleError(
          new Error('Unstaged changes could not be restored due to a merge conflict!'),
          ctx,
          RestoreUnstagedChangesError
        )
      }
    }
  }

  /**
   * Drop the created diff file after everything has run.
   * Won't throw if the file has already been deleted (theoretically).
   */
  async cleanup() {
    debug('Removing temp files...')
    await unlink(this.getHiddenFilepath(PATCH_UNSTAGED))
    await unlink(this.getHiddenFilepath(PATCH_PARTIAL))
    debug('Done removing temp files!')
  }
}

module.exports = GitWorkflow
