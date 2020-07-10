const GitWorkflow = require('./gitWorkflow')
const {
  applyModificationsSkipped,
  hasPartiallyStagedFiles,
  restoreUnstagedChangesSkipped,

  restoreOriginalStateEnabled,
  restoreOriginalStateSkipped,
  cleanupEnabled,
  cleanupSkipped,
} = require('./state')

const {
  GIT_ERROR,
  RESTORE_STASH_EXAMPLE,
  PREVENTED_EMPTY_COMMIT,
  SKIPPED_GIT_ERROR,
} = require('./messages')

const { GitError, ApplyEmptyCommitError, GetBackupStashError } = require('./symbols')

class GitAdapter {
  constructor({ allowEmpty, stash, cwd, ctx, logger }) {
    this.workflow = new GitWorkflow({ allowEmpty, stash, cwd, logger })
    this.ctx = ctx
  }

  async init() {
    const { baseDir, shouldBackup } = await this.workflow.init(this.ctx)
    const files = await this.workflow.getStagedFiles()

    this.ctx.shouldBackup = shouldBackup

    return { files, baseDir }
  }

  executeTasksSkipped() {
    if (this.ctx.errors.has(GitError)) return SKIPPED_GIT_ERROR
  }

  beforeAll() {
    return [
      {
        title: 'Preparing...',
        task: (ctx) => this.workflow.prepare(ctx),
      },
      {
        title: 'Hiding unstaged changes to partially staged files...',
        task: (ctx) => this.workflow.hideUnstagedChanges(ctx),
        enabled: (ctx) => this.workflow.hasPartiallyStagedFiles(ctx),
      },
    ]
  }

  afterAll() {
    return [
      {
        title: 'Applying modifications...',
        task: (ctx) => this.workflow.applyModifications(ctx),
        skip: applyModificationsSkipped,
      },
      {
        title: 'Restoring unstaged changes to partially staged files...',
        task: (ctx) => this.workflow.restoreUnstagedChanges(ctx),
        enabled: hasPartiallyStagedFiles,
        skip: restoreUnstagedChangesSkipped,
      },
      {
        title: 'Reverting to original state because of errors...',
        task: (ctx) => this.workflow.restoreOriginalState(ctx),
        enabled: restoreOriginalStateEnabled,
        skip: restoreOriginalStateSkipped,
      },
      {
        title: 'Cleaning up...',
        task: (ctx) => this.workflow.cleanup(ctx),
        enabled: cleanupEnabled,
        skip: cleanupSkipped,
      },
    ]
  }

  finalize() {
    const ctx = this.ctx
    if (ctx.errors.has(ApplyEmptyCommitError)) {
      this.logger.warn(PREVENTED_EMPTY_COMMIT)
    } else if (ctx.errors.has(GitError) && !ctx.errors.has(GetBackupStashError)) {
      this.logger.error(GIT_ERROR)
      if (ctx.shouldBackup) {
        // No sense to show this if the backup stash itself is missing.
        this.logger.error(RESTORE_STASH_EXAMPLE)
      }
    }
  }
}

module.exports = GitAdapter
