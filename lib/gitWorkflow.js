import path from 'node:path'

import debug from 'debug'

import { execGit } from './execGit.js'
import { readFile, unlink, writeFile } from './file.js'
import { getDiffCommand } from './getDiffCommand.js'
import {
  ApplyEmptyCommitError,
  GetBackupStashError,
  GitError,
  HideUnstagedChangesError,
  RestoreMergeStatusError,
  RestoreOriginalStateError,
  RestoreUnstagedChangesError,
} from './symbols.js'

const debugLog = debug('lint-staged:GitWorkflow')

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

export const STASH = 'lint-staged automatic backup'

const PATCH_UNSTAGED = 'lint-staged_unstaged.patch'

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

export class GitWorkflow {
  constructor({ allowEmpty, gitConfigDir, topLevelDir, matchedFileChunks, diff, diffFilter }) {
    this.execGit = (args, options = {}) => execGit(args, { ...options, cwd: topLevelDir })
    this.deletedFiles = []
    this.gitConfigDir = gitConfigDir
    this.topLevelDir = topLevelDir
    this.diff = diff
    this.diffFilter = diffFilter
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
   * Get name of backup stash
   */
  async getBackupStash(ctx) {
    const stashes = await this.execGit(['stash', 'list'])

    const index = stashes
      .split('\n')
      .findIndex((line) => line.includes(STASH) && line.includes(ctx.stashIdentifier))

    if (index === -1) {
      ctx.errors.add(GetBackupStashError)
      throw new Error('lint-staged automatic backup is missing!')
    }

    return String(index)
  }

  /**
   * Save meta information about ongoing git merge
   */
  async backupMergeStatus() {
    debugLog('Backing up merge state...')
    await Promise.all([
      readFile(this.mergeHeadFilename).then((buffer) => (this.mergeHeadBuffer = buffer)),
      readFile(this.mergeModeFilename).then((buffer) => (this.mergeModeBuffer = buffer)),
      readFile(this.mergeMsgFilename).then((buffer) => (this.mergeMsgBuffer = buffer)),
    ])
    debugLog('Done backing up merge state!')
  }

  /**
   * Restore meta information about ongoing git merge
   */
  async restoreMergeStatus(ctx) {
    debugLog('Restoring merge state...')
    try {
      await Promise.all([
        this.mergeHeadBuffer && writeFile(this.mergeHeadFilename, this.mergeHeadBuffer),
        this.mergeModeBuffer && writeFile(this.mergeModeFilename, this.mergeModeBuffer),
        this.mergeMsgBuffer && writeFile(this.mergeMsgFilename, this.mergeMsgBuffer),
      ])
      debugLog('Done restoring merge state!')
    } catch (error) {
      debugLog('Failed restoring merge state with error:')
      debugLog(error)
      handleError(
        new Error('Merge state could not be restored due to an error!'),
        ctx,
        RestoreMergeStatusError
      )
    }
  }

  /**
   * Get a list of all files whose modification status matches a filter.
   * Renames have special treatment, since the single status line includes
   * both the "from" and "to" filenames, where "from" is no longer on disk.
   */
  async getFiles(filter) {
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
    return (
      status
        // eslint-disable-next-line no-control-regex
        .split(/\x00(?=[ AMDRCU?!]{2} |$)/)
        .filter((line) => {
          const [index, workingTree] = line
          return filter(index, workingTree)
        })
        .map((line) => line.substr(3)) // Remove first three letters (index, workingTree, and a whitespace)
        .filter(Boolean) // Filter empty string
    )
  }

  /**
   * Get a list of unstaged deleted files.
   */
  async getDeletedFiles() {
    debugLog('Getting deleted files...')

    const deleted = await this.getFiles((index, workingTree) => {
      return workingTree === 'D'
    })

    debugLog('Found deleted files:', deleted)
    return deleted
  }

  /**
   * Get a list of files with both staged and unstaged changes.
   */
  async getPartiallyStagedFiles() {
    debugLog('Getting partially staged files...')

    const partiallyStaged = await this.getFiles((index, workingTree) => {
      return index !== ' ' && workingTree !== ' ' && index !== '?' && workingTree !== '?'
    })

    debugLog('Found partially staged files:', partiallyStaged)
    return partiallyStaged
  }

  /**
   * Get a list of tracked files without staged changes.
   */
  async getUnstagedFiles() {
    debugLog('Getting unstaged files...')

    const unstaged = await this.getFiles((index, workingTree) => {
      return index === ' ' && workingTree !== ' '
    })

    debugLog('Found unstaged files:', unstaged)
    return unstaged
  }

  /**
   * Get a list of untracked files.
   */
  async getUntrackedFiles() {
    debugLog('Getting untracked files...')

    const untracked = await this.getFiles((index, workingTree) => {
      return index === '?' && workingTree === '?'
    })

    debugLog('Found untracked files:', untracked)
    return untracked
  }

  /**
   * Create a diff of unstaged changes and backup stash if enabled.
   */
  async prepare(ctx, task) {
    try {
      debugLog(task.title)

      // Get a list of files with both staged and unstaged changes.
      // Unstaged changes to these files should be hidden before the tasks run.
      this.partiallyStagedFiles = await this.getPartiallyStagedFiles()

      // Get a list of files with unstaged changes.
      // Changes to these files should be hidden before the tasks run.
      this.unstagedFiles = await this.getUnstagedFiles()

      // Get a list of unstaged files.
      // Unstaged files should be moved to a temporary directory before the tasks run.
      this.untrackedFiles = await this.getUntrackedFiles()

      if (
        this.partiallyStagedFiles.length ||
        this.unstagedFiles.length ||
        this.untrackedFiles.length
      ) {
        const unstagedPatch = this.getHiddenFilepath(PATCH_UNSTAGED)
        const files = processRenames([
          ...(ctx.shouldHidePartiallyStaged ? this.partiallyStagedFiles : []),
          ...(ctx.shouldHideUnstaged ? this.unstagedFiles : []),
          ...(ctx.shouldHideUntracked ? this.untrackedFiles : []),
        ])

        if (ctx.shouldHideUntracked && this.untrackedFiles.length) {
          await this.execGit(['add', '--intent-to-add', ...this.untrackedFiles])
        }

        await this.execGit(['diff', ...GIT_DIFF_ARGS, '--output', unstagedPatch, '--', ...files])

        if (ctx.shouldHideUntracked && this.untrackedFiles.length) {
          await this.execGit(['reset', ...this.untrackedFiles])
        }
      }

      ctx.hasPartiallyStagedFiles = this.partiallyStagedFiles.length > 0
      ctx.hasUnstagedFiles = this.unstagedFiles.length > 0
      ctx.hasUntrackedFiles = this.untrackedFiles.length > 0

      /**
       * If backup stash should be skipped, no need to continue
       */
      if (!ctx.shouldBackup) return

      // When backup is enabled, the revert will clear ongoing merge status.
      await this.backupMergeStatus()

      // Get a list of unstaged deleted files, because certain bugs might cause them to reappear:
      // - in git versions =< 2.13.0 the `git stash --keep-index` option resurrects deleted files
      // - git stash can't infer RD or MD states correctly, and will lose the deletion
      this.deletedFiles = (await this.getDeletedFiles()).map((file) =>
        path.resolve(this.topLevelDir, file)
      )

      // Generate a unique identifier to include in the stash message
      ctx.stashIdentifier = new Date().toISOString()

      // Save stash of all staged files.
      // `git stash create` and `git stash store` are not compatible with `--include-untracked,
      // so we must push the index and working tree to the stash and restore afterwards.
      await this.execGit([
        'stash',
        'push',
        ctx.shouldHideUntracked ? '--include-untracked' : '--no-include-untracked',
        '--quiet',
        '--message',
        `${STASH} (${ctx.stashIdentifier})`,
      ])

      // Restore stash to index and working tree, but do not drop the stash.
      const rev = await this.execGit(['rev-parse', '--short', 'stash@{0}'])
      await this.execGit(['stash', 'apply', '--quiet', '--index', rev])
      await this.restoreMergeStatus(ctx)

      task.title = `Backed up original state in git stash (${ctx.stashIdentifier})`
      debugLog(task.title)
    } catch (error) {
      handleError(error, ctx)
    }
  }

  /**
   * Remove unstaged changes depending on configuration, to prevent tasks from seeing them
   */
  async hideUnstagedChanges(ctx) {
    try {
      const trackedFiles = processRenames(
        [
          ...(ctx.shouldHidePartiallyStaged ? this.partiallyStagedFiles : []),
          ...(ctx.shouldHideUnstaged ? this.unstagedFiles : []),
        ],
        false
      )

      if (trackedFiles.length) {
        await this.execGit(['checkout', '--force', '--', ...trackedFiles])
      }

      await Promise.all(
        (ctx.shouldHideUntracked ? this.untrackedFiles : []).map((file) =>
          unlink(path.resolve(this.topLevelDir, file))
        )
      )
    } catch (error) {
      handleError(error, ctx, HideUnstagedChangesError)
    }
  }

  /**
   * Applies back task modifications, and unstaged changes hidden in the stash.
   * In case of a merge-conflict retry with 3-way merge.
   */
  async applyModifications(ctx) {
    debugLog('Adding task modifications to index...')

    // `matchedFileChunks` includes staged files that lint-staged originally detected and matched against a task.
    // Add only these files so any 3rd-party edits to other files won't be included in the commit.
    // These additions per chunk are run "serially" to prevent race conditions.
    // Git add creates a lockfile in the repo causing concurrent operations to fail.
    for (const files of this.matchedFileChunks) {
      await this.execGit(['add', '--', ...files])
    }

    debugLog('Done adding task modifications to index!')

    const stagedFilesAfterAdd = await this.execGit([
      ...getDiffCommand(this.diff, this.diffFilter),
      '--name-only',
      '-z',
    ])

    if (!stagedFilesAfterAdd && !this.allowEmpty) {
      // Tasks reverted all staged changes and the commit would be empty
      // Throw error to stop commit unless `--allow-empty` was used
      handleError(new Error('Prevented an empty git commit!'), ctx, ApplyEmptyCommitError)
    }
  }

  /**
   * Restore unstaged changes to partially changed files. If it at first fails,
   * this is probably because of conflicts between new task modifications.
   * 3-way merge usually fixes this, and in case it doesn't we should just give up and throw.
   */
  async restoreUnstagedChanges(ctx) {
    debugLog('Restoring unstaged changes...')
    const unstagedPatch = this.getHiddenFilepath(PATCH_UNSTAGED)
    try {
      await this.execGit(['apply', ...GIT_APPLY_ARGS, unstagedPatch])
    } catch (applyError) {
      debugLog('Error while restoring changes:')
      debugLog(applyError)
      debugLog('Retrying with 3-way merge')
      try {
        // Retry with a 3-way merge if normal apply fails
        await this.execGit(['apply', ...GIT_APPLY_ARGS, '--3way', unstagedPatch])
      } catch (threeWayApplyError) {
        debugLog('Error while restoring unstaged changes using 3-way merge:')
        debugLog(threeWayApplyError)
        handleError(
          new Error('Unstaged changes could not be restored due to a merge conflict!'),
          ctx,
          RestoreUnstagedChangesError
        )
      }
    }
  }

  /**
   * Restore original HEAD state in case of errors
   */
  async restoreOriginalState(ctx) {
    try {
      debugLog('Restoring original state...')
      await this.execGit(['reset', '--hard', 'HEAD'])
      await this.execGit(['stash', 'apply', '--quiet', '--index', await this.getBackupStash(ctx)])

      // Restore meta information about ongoing git merge
      await this.restoreMergeStatus(ctx)

      // If stashing resurrected deleted files, clean them out
      await Promise.all(this.deletedFiles.map((file) => unlink(file)))

      // Clean out patch
      await unlink(this.getHiddenFilepath(PATCH_UNSTAGED))

      debugLog('Done restoring original state!')
    } catch (error) {
      handleError(error, ctx, RestoreOriginalStateError)
    }
  }

  /**
   * Drop the created stashes after everything has run
   */
  async cleanup(ctx) {
    try {
      debugLog('Dropping backup stash...')
      await this.execGit(['stash', 'drop', '--quiet', await this.getBackupStash(ctx)])
      debugLog('Done dropping backup stash!')
    } catch (error) {
      handleError(error, ctx)
    }
  }
}
