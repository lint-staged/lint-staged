'use strict'

const { GIT_ERROR, TASK_ERROR } = require('./messages')
const {
  ApplyEmptyCommitError,
  TaskError,
  GitError,
  RestoreUnstagedChangesError,
} = require('./symbols')

const getInitialState = ({ quiet = false } = {}) => ({
  hasPartiallyStagedFiles: null,
  shouldBackup: null,
  errors: new Set([]),
  output: [],
  quiet,
})

const hasPartiallyStagedFiles = (ctx) => ctx.hasPartiallyStagedFiles

const applyModificationsSkipped = (ctx) => {
  // Always apply back unstaged modifications when skipping backup
  if (!ctx.shouldBackup) return false
  // Should be skipped in case of git errors
  if (ctx.errors.has(GitError)) {
    return GIT_ERROR
  }
  // Should be skipped when tasks fail
  if (ctx.errors.has(TaskError)) {
    return TASK_ERROR
  }
}

const restorePartialChangesSkipped = (ctx) => {
  // Should be skipped in case of git errors
  if (ctx.errors.has(GitError)) {
    return GIT_ERROR
  }
}

const restoreOriginalStateEnabled = (ctx) => ctx.shouldBackup && ctx.errors.has(TaskError)

const restoreOriginalStateSkipped = (ctx) => {
  // Should be skipped in case of unknown git errors
  if (
    ctx.errors.has(GitError) &&
    !ctx.errors.has(ApplyEmptyCommitError) &&
    !ctx.errors.has(RestoreUnstagedChangesError)
  ) {
    return GIT_ERROR
  }
}

const cleanupEnabled = (ctx) => ctx.shouldBackup

const cleanupSkipped = (ctx) => {
  // Should be skipped in case of unknown git errors
  if (
    ctx.errors.has(GitError) &&
    !ctx.errors.has(ApplyEmptyCommitError) &&
    !ctx.errors.has(RestoreUnstagedChangesError)
  ) {
    return GIT_ERROR
  }
}

module.exports = {
  getInitialState,
  hasPartiallyStagedFiles,
  applyModificationsSkipped,
  restorePartialChangesSkipped,
  restoreOriginalStateEnabled,
  restoreOriginalStateSkipped,
  cleanupEnabled,
  cleanupSkipped,
}
