import EventEmitter from 'events'

import { GIT_ERROR, TASK_ERROR } from './messages.js'
import {
  ExitCodeError,
  GitError,
  RestoreOriginalStateError,
  RestoreUnstagedChangesError,
  TaskError,
} from './symbols.js'

export const getInitialState = ({
  hidePartiallyStaged = true,
  hideUnstaged = false,
  quiet = false,
  revert = true,
} = {}) => ({
  backupHash: null,
  errors: new Set([]),
  events: new EventEmitter(),
  hasFilesToHide: null,
  output: [],
  quiet,
  shouldBackup: null,
  shouldHidePartiallyStaged: hidePartiallyStaged,
  shouldHideUnstaged: hideUnstaged,
  shouldRevert: revert,
  unstagedPatch: null,
})

export const shouldHideUnstagedFiles = (ctx) =>
  (ctx.shouldHideUnstaged || ctx.shouldHidePartiallyStaged) && ctx.hasFilesToHide

export const applyModificationsSkipped = (ctx) => {
  // Always apply back unstaged modifications when skipping revert or backup
  if (!ctx.shouldRevert || !ctx.shouldBackup) return false
  // Should be skipped in case of git errors
  if (ctx.errors.has(GitError)) {
    return GIT_ERROR
  }
  // Should be skipped when tasks fail
  if (ctx.errors.has(TaskError)) {
    return TASK_ERROR
  }
}

export const restoreUnstagedChangesSkipped = (ctx) => {
  // Should be skipped in case of git errors
  if (ctx.errors.has(GitError)) {
    return GIT_ERROR
  }

  // Should be skipped when tasks fail
  if (ctx.errors.has(TaskError)) {
    return TASK_ERROR
  }
}

export const restoreOriginalStateEnabled = (ctx) =>
  !!ctx.shouldRevert &&
  !!ctx.shouldBackup &&
  (ctx.errors.has(ExitCodeError) ||
    ctx.errors.has(TaskError) ||
    ctx.errors.has(RestoreUnstagedChangesError))

export const restoreOriginalStateSkipped = (ctx) => {
  // Should be skipped in case of unknown git errors
  if (
    ctx.errors.has(GitError) &&
    !ctx.errors.has(RestoreUnstagedChangesError) &&
    !ctx.errors.has(ExitCodeError)
  ) {
    return GIT_ERROR
  }
}

export const cleanupEnabled = (ctx) => ctx.shouldBackup

export const cleanupSkipped = (ctx) => {
  // Should be skipped in case of unknown git errors
  if (restoreOriginalStateSkipped(ctx)) {
    return GIT_ERROR
  }

  // Should be skipped when reverting to original state fails
  if (ctx.errors.has(RestoreOriginalStateError)) {
    return GIT_ERROR
  }
}
