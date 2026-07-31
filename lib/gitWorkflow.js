import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { dim } from './colors.js'
import { createDebug } from './debug.js'
import { execGit } from './execGit.js'
import * as figures from './figures.js'
import { readFile, unlink, writeFile } from './file.js'
import { getDiffCommand } from './getDiffCommand.js'
import { chunkFilesForCommand } from './getSpawnedTasks.js'
import { normalizePath } from './normalizePath.js'
import { parseGitZOutput } from './parseGitZOutput.js'
import { runParallelTasks } from './runParallelTasks.js'
import {
  ApplyEmptyCommitError,
  FailOnChangesError,
  GetBackupStashError,
  GitError,
  HideUnstagedChangesError,
  RestoreMergeStatusError,
  RestoreOriginalStateError,
  RestoreUnstagedChangesError,
  TaskError,
} from './symbols.js'

const debugLog = createDebug('lint-staged:GitWorkflow')

const MERGE_HEAD = 'MERGE_HEAD'
const MERGE_MODE = 'MERGE_MODE'
const MERGE_MSG = 'MERGE_MSG'

// In git status machine output, renames are presented as `to`NUL`from`
// When diffing, both need to be taken into account, but in some cases on the `to`.
// oxlint-disable-next-line no-control-regex
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

const calculateSha256 = (input) => crypto.createHash('sha256').update(input, 'utf-8').digest('hex')

const QUOTES_REGEXP = /^"(.*)"$/

/**
 * The lines are wrapped in double quotes
 * @returns {string[]}
 */
const cleanGitStashOutput = (lines) => lines.map((line) => line.replace(QUOTES_REGEXP, '$1'))

// oxlint-disable-next-line no-control-regex
const GIT_STATUS_Z_REGEXP = /\x00(?=[ AMDRCU?!]{2} |$)/

export class GitWorkflow {
  /**
   * @param {Object} opts
   */
  constructor({
    allowEmpty,
    diff,
    diffFilter,
    failOnChanges,
    gitConfigDir,
    logger,
    matchedFiles,
    maxArgLength,
    topLevelDir,
  }) {
    this.execGit = (args, options = {}) => execGit(args, { ...options, cwd: topLevelDir })
    this.allowEmpty = allowEmpty
    this.diff = diff
    this.diffFilter = diffFilter
    this.gitConfigDir = gitConfigDir
    this.failOnChanges = !!failOnChanges
    this.logger = logger
    /** @type {Set<import('./getStagedFiles.js').StagedFile>} */
    this.matchedFiles = matchedFiles
    this.maxArgLength = maxArgLength
    this.topLevelDir = topLevelDir

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
    /** Print stash list with short hash and subject */
    const stashes = await this.execGit(['stash', 'list', '--format="%h %s"', '-z'])
      .then(parseGitZOutput)
      .then(cleanGitStashOutput)

    const index = stashes.findIndex((line) => line.startsWith(ctx.backupHash))

    if (index === -1) {
      ctx.errors.add(GetBackupStashError)
      this.logger.error(`${figures.error()} lint-staged automatic backup is missing!`)
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
      ctx.errors.add(GitError)
      ctx.errors.add(RestoreMergeStatusError)

      debugLog('Failed restoring merge state with error:')
      debugLog(error)

      throw error
    }
  }

  /**
   * Get a list of all files with both staged and unstaged modifications.
   * Renames have special treatment, since the single status line includes
   * both the "from" and "to" filenames, where "from" is no longer on disk.
   */
  async getUnstagedFiles({ onlyPartial = false } = {}) {
    debugLog('Getting partially staged files...')
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
    const unstagedFiles = status
      // oxlint-disable-next-line no-control-regex
      .split(GIT_STATUS_Z_REGEXP)
      .filter((line) => {
        const [index, workingTree] = line
        const updatedInIndex = index !== ' ' && index !== '?'
        const updatedInWorkingTree = workingTree !== ' ' && workingTree !== '?'

        if (onlyPartial) {
          return updatedInIndex && updatedInWorkingTree
        }

        return updatedInWorkingTree
      })
      .map((line) => line.slice(3)) // Remove first three letters (index, workingTree, and a whitespace)
      .filter(Boolean) // Filter empty strings
    debugLog(`Found ${onlyPartial ? 'partially staged' : 'unstaged'} files:`, unstagedFiles)
    return unstagedFiles.length ? unstagedFiles : null
  }

  /**
   * Create a diff of unstaged or partially staged files and backup stash if enabled.
   */
  async prepare(ctx) {
    this.logger.log(
      dim(
        `${figures.wip()} ${ctx.shouldBackup ? 'Backing up original state…' : 'Preparing lint-staged…'}`
      )
    )

    try {
      if (ctx.shouldBackup) {
        // When backup is enabled, the revert will clear ongoing merge status.
        await this.backupMergeStatus()
      }

      if (ctx.shouldHideUnstaged || ctx.shouldHideAll) {
        this.unstagedFiles = await this.getUnstagedFiles({ onlyPartial: false })
        ctx.hasFilesToHide = !!this.unstagedFiles
      } else if (ctx.shouldHidePartiallyStaged) {
        this.unstagedFiles = await this.getUnstagedFiles({ onlyPartial: true })
        ctx.hasFilesToHide = !!this.unstagedFiles
      }

      if (this.unstagedFiles) {
        const unstagedPatch = this.getHiddenFilepath(PATCH_UNSTAGED)
        ctx.unstagedPatch = unstagedPatch
        const files = processRenames(this.unstagedFiles)
        await this.execGit(['diff', ...GIT_DIFF_ARGS, '--output', unstagedPatch, '--', ...files])
      }

      if (ctx.shouldBackup) {
        if (ctx.shouldHideUnstaged || ctx.shouldHideAll) {
          const args = ['stash', 'push', '--keep-index', '--message', STASH]
          if (ctx.shouldHideAll) args.push('--include-untracked')
          /** Save stash of all changes, clearing the working tree but keeping staged files as-is */
          await this.execGit(args)
          /** Print stash list with short hash and subject */
          const stashes = await this.execGit(['stash', 'list', '--format="%h %s"', '-z'])
            .then(parseGitZOutput)
            .then(cleanGitStashOutput)

          /** The stash line starts with the short hash, so we split from space and choose the first part */
          ctx.backupHash = stashes.find((line) => line.includes(STASH))?.split(' ')[0]

          await this.restoreMergeStatus(ctx)
        } else {
          /** Save stash of all changes, keeping all files as-is */
          const stashHash = await this.execGit(['stash', 'create'])
          ctx.backupHash = await this.execGit(['rev-parse', '--short', stashHash])
          await this.execGit(['stash', 'store', '--quiet', '--message', STASH, ctx.backupHash])
        }
      }

      this.logger.log(
        `${figures.done()} ${
          ctx.shouldBackup
            ? `Done backing up original state (${ctx.backupHash})!`
            : 'Done preparing lint-staged!'
        }`
      )
    } catch (error) {
      ctx.errors.add(GitError)

      const errorMessage = ctx.shouldBackup
        ? 'Failed to back up original state!'
        : 'Failed to prepare lint-staged!'

      this.logger.error(`${figures.error()} ${errorMessage}`)
      debugLog(error)
    }
  }

  async hidePartiallyStagedChanges(ctx) {
    this.logger.log(dim(`${figures.wip()} Hiding unstaged changes to partially staged files…`))

    try {
      const files = processRenames(this.unstagedFiles, false)
      await this.execGit(['restore', '--worktree', '--', ...files])
      this.logger.log(`${figures.done()} Done hiding unstaged changes to partially staged files!`)
    } catch (error) {
      /**
       * `git checkout --force` doesn't throw errors, so it shouldn't be possible to get here.
       */
      ctx.errors.add(GitError)
      ctx.errors.add(HideUnstagedChangesError)

      const errorMessage = `${figures.error()} Failed to hude unstaged changes to partially staged files!`

      this.logger.error(errorMessage)
      debugLog(error)
    }
  }

  async runTasks(ctx, tasks, { abortController, concurrent }) {
    this.logger.log(
      dim(`${figures.wip()} Running tasks for ${this.diff ? 'changed' : 'staged'} files…`)
    )

    if (ctx.shouldFailOnChanges) {
      try {
        debugLog(
          'Calculating SHA-256 hash of unstaged changes because "--fail-on-changes" was used...'
        )
        const diff = await this.execGit(['diff', '--patch', '--unified=0'])
        ctx.unstagedDiffSha256 = calculateSha256(diff)
        debugLog('SHA-256 hash of unstaged changes is %s', ctx.unstagedDiffSha256)
      } catch (error) {
        ctx.errors.add(GitError)
        this.logger.error('Failed to calculate SHA-256 hash of unstaged changes!')
        debugLog(error)
        return
      }
    }

    const failureMessage = `${figures.error()} Failed to run tasks for ${this.diff ? 'changed' : 'staged'} files!`

    try {
      await runParallelTasks(ctx, tasks, { abortController, concurrent, logger: this.logger })

      this.logger.log(
        ctx.errors.has(TaskError)
          ? failureMessage
          : `${figures.done()} Done running tasks for ${this.diff ? 'changed' : 'staged'} files!`
      )
    } catch (error) {
      ctx.errors.add(TaskError)
      this.logger.error(failureMessage)
      debugLog(error)
    }
  }

  /** Update Git index again for the originally staged files to stage task modifications. */
  async updateIndex(ctx) {
    this.logger.log(dim(`${figures.wip()} Staging changes from tasks…`))

    try {
      if (ctx.shouldFailOnChanges) {
        debugLog(
          'Calculating SHA-256 hash of changes after tasks because "--fail-on-changes" was used...'
        )
        const diff = await this.execGit(['diff', '--patch', '--unified=0'])
        const diffSha256 = calculateSha256(diff)
        debugLog('SHA-256 hash of changes after tasks is %s', diffSha256)

        if (ctx.unstagedDiffSha256 !== diffSha256) {
          ctx.errors.add(FailOnChangesError)
          this.logger.error(
            `${figures.error()} Tasks modified files and --fail-on-changes was used!`
          )
          return
        }
      }

      // This looks confusing but the intent is to only normalize truthy values
      const activeIndexFile = process.env.GIT_INDEX_FILE
        ? normalizePath(process.env.GIT_INDEX_FILE)
        : process.env.GIT_INDEX_FILE

      const accessCheckedFiles = await Promise.allSettled(
        Array.from(this.matchedFiles, async (f) => {
          if (f.status === 'D') {
            await fs.access(f.filepath)
            return f.filepath // File is no longer deleted and can be added
          } else {
            return f.filepath
          }
        })
      )

      const addableFiles = accessCheckedFiles.flatMap((r) =>
        r.status === 'fulfilled' ? [r.value] : []
      )

      const addCommands = await chunkFilesForCommand('git add --', addableFiles, this.maxArgLength)

      /** Needs to be run serially because of locking Git operation */
      for (const { files } of addCommands) {
        debugLog('Updating active Git index: %s', activeIndexFile)
        await this.execGit(['add', '--', ...files])
        debugLog('Done updating Git index: %s', activeIndexFile)

        if (activeIndexFile?.endsWith('.lock')) {
          const defaultIndexLock = normalizePath(
            await this.execGit(['rev-parse', '--path-format=absolute', '--git-path', 'index.lock'])
          )

          /**
           * If the active index file is a non-default lockfile, we are committing with a pathspec
           * without having explicitly run `git add`. In this case we need to also update the
           * default index, otherwise there will be leftover diff after committing
           */
          if (activeIndexFile !== defaultIndexLock) {
            debugLog('Updating default Git index again: %s', defaultIndexLock)
            await this.execGit(['add', '--', ...files], {
              env: {
                GIT_INDEX_FILE: defaultIndexLock,
              },
            })
            debugLog('Done updating default Git index lock: %s', defaultIndexLock)
          }
        }
      }

      const stagedFilesAfterAdd = await this.execGit([
        ...getDiffCommand(this.diff, this.diffFilter),
        '--name-only',
        '-z',
      ])

      if (!stagedFilesAfterAdd && !this.allowEmpty) {
        // Tasks reverted all staged changes and the commit would be empty
        // Stop commit unless `--allow-empty` was used
        ctx.errors.add(ApplyEmptyCommitError)
        this.logger.error(`${figures.error()} Prevented an empty git commit!`)
      } else {
        this.logger.log(`${figures.done()} Done staging changes from tasks!`)
      }
    } catch (error) {
      ctx.errors.add(GitError)

      this.logger.log(`${figures.error()} Failed to stage changes from tasks!`)
      debugLog(error)
    }
  }

  /**
   * Restore unstaged changes to partially changed files. If it at first fails,
   * this is probably because of conflicts between new task modifications.
   * 3-way merge usually fixes this, and in case it doesn't we should just give up and throw.
   */
  async restoreUnstagedChanges(ctx) {
    this.logger.log(dim(`${figures.wip()} Restoring unstaged changes…`))

    const unstagedPatch = this.getHiddenFilepath(PATCH_UNSTAGED)

    try {
      await this.execGit(['apply', ...GIT_APPLY_ARGS, unstagedPatch])
    } catch (applyError) {
      debugLog('Error while restoring changes:')
      debugLog(applyError)
      debugLog('Retrying with 3-way merge')
      // Retry with a 3-way merge if normal apply fails
      try {
        await this.execGit(['apply', ...GIT_APPLY_ARGS, '--3way', unstagedPatch])
      } catch (threeWayApplyError) {
        ctx.errors.add(GitError)
        ctx.errors.add(RestoreUnstagedChangesError)

        this.logger.error(`${figures.error()} Failed to restore unstaged changes!`)
        debugLog(threeWayApplyError)
      }
    }
  }

  async restoreUntrackedFiles(ctx) {
    this.logger.log(dim(`${figures.wip()} Restoring untracked files…`))

    try {
      const backupStash = await this.getBackupStash(ctx)
      const untrackedFiles = await this.execGit([
        'stash',
        'show',
        '--only-untracked',
        '--name-only',
        '-z',
        backupStash,
      ]).then(parseGitZOutput)

      if (untrackedFiles.length) {
        debugLog('Found untracked files: %s', untrackedFiles)
        await this.execGit([
          'restore',
          '--source',
          `${ctx.backupHash}^3`,
          '--',
          ...untrackedFiles.map(normalizePath),
        ])

        this.logger.log(`${figures.done()} ${'Done restoring untracked files!'}`)
      } else {
        this.logger.log(`${figures.cancelled()} ${dim('No untracked files to restore!')}`)
      }
    } catch (restoreUntrackedFilesError) {
      ctx.errors.add(GitError)
      ctx.errors.add(RestoreUnstagedChangesError)

      this.logger.error(`${figures.error()} ${'Failed to restore untracked files!'}`)
      debugLog(restoreUntrackedFilesError)
    }
  }

  /**
   * Restore original HEAD state in case of errors
   */
  async restoreOriginalState(ctx) {
    this.logger.log(dim(`${figures.wip()} Reverting to original state because of errors…`))

    try {
      debugLog('Restoring original state...')
      await this.execGit(['reset', '--hard', 'HEAD'])
      await this.execGit(['stash', 'apply', '--quiet', '--index', await this.getBackupStash(ctx)])

      await this.restoreMergeStatus(ctx)

      // Clean out patch
      await unlink(this.getHiddenFilepath(PATCH_UNSTAGED))

      this.logger.log(`${figures.done()} Done reverting to original state!`)
    } catch (error) {
      ctx.errors.add(GitError)
      ctx.errors.add(RestoreOriginalStateError)

      this.logger.error(`${figures.error()} Failed to revert to original state!`)
      debugLog(error)
    }
  }

  /**
   * Drop the created stashes after everything has run
   */
  async cleanup(ctx) {
    this.logger.log(dim(`${figures.wip()} Cleaning up temporary files…`))

    try {
      await this.execGit(['stash', 'drop', '--quiet', await this.getBackupStash(ctx)])
      this.logger.log(`${figures.done()} Done cleaning up temporary files!`)
    } catch (error) {
      ctx.errors.add(GitError)
      this.logger.error(`${figures.error()} Failed to clean up temporary files!`)
      debugLog(error)
    }
  }
}
