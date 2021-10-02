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
  shouldReset: null,
  errors: new Set([]),
  output: [],
  quiet,
})

const hasPartiallyStagedFiles = (ctx) => ctx.hasPartiallyStagedFiles

const applyModificationsSkipped = (ctx) => {
  // Always apply back unstaged modifications when skipping backup
  if (!ctx.shouldReset) return false

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
  // Should be skipped when entire state has already been restored
  if (restoreOriginalStateEnabled(ctx)) {
    return TASK_ERROR
  }

  // Should be skipped in case of git errors
  if (ctx.errors.has(GitError)) {
    return GIT_ERROR
  }
}

const restoreOriginalStateEnabled = (ctx) => {
  if (ctx.shouldReset && ctx.errors.has(TaskError)) {
    return TASK_ERROR
  }

  if (ctx.errors.has(ApplyEmptyCommitError)) {
    return true
  }
}

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

const cleanupEnabled = (ctx) => ctx.shouldReset

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
