import crypto from 'node:crypto'

import { gitError, taskError } from './messages.js'
import {
  FailOnChangesError,
  GitError,
  RestoreOriginalStateError,
  RestoreUnstagedChangesError,
  TaskError,
} from './symbols.js'

export const getInitialState = ({
  failOnChanges = false,
  hideAll = false,
  hideUnstaged = false,
  hidePartiallyStaged = !(hideAll || hideUnstaged),
  quiet = false,
  revert = true,
} = {}) => {
  const initialState = {
    backupHash: undefined,
    errors: new Set([]),
    shouldFailOnChanges: failOnChanges,
    hasFilesToHide: null,
    output: [],
    quiet,
    runId: crypto.randomBytes(4).toString('hex'),
    shouldBackup: null,
    shouldHideAll: hideAll,
    shouldHideUnstaged: hideUnstaged,
    shouldHidePartiallyStaged: hidePartiallyStaged,
    shouldRevert: revert,
    unstagedDiffSha256: null,
    unstagedPatch: null,
  }

  if (initialState.shouldHideAll) {
    initialState.shouldHideUnstaged = false // becomes redundant
    initialState.shouldHidePartiallyStaged = false // becomes redundant
  } else if (initialState.shouldHideUnstaged) {
    initialState.shouldHidePartiallyStaged = false // becomes redundant
  }

  return initialState
}

export const shouldHidePartiallyStagedFiles = (ctx) =>
  ctx.shouldHidePartiallyStaged && ctx.hasFilesToHide

export const shouldRestoreUnstagedChanges = (ctx) =>
  (ctx.shouldHideAll || ctx.shouldHideUnstaged || ctx.shouldHidePartiallyStaged) &&
  ctx.hasFilesToHide

export const shouldRestoreUntrackedFiles = (ctx) => !!ctx.shouldHideAll

export const updateIndexSkipped = (ctx) => {
  // Always apply back unstaged modifications when skipping revert or backup
  if (!ctx.shouldRevert || !ctx.shouldBackup) return false

  // Should be skipped in case of git errors
  if (ctx.errors.has(GitError)) {
    return gitError()
  }

  // Should be skipped when tasks fail
  if (ctx.errors.has(TaskError)) {
    return taskError()
  }
}

export const restoreUnstagedChangesSkipped = (ctx) => {
  // Should be skipped in case of git errors
  if (ctx.errors.has(GitError)) {
    return gitError()
  }

  // When complete reverting to original state is skipped,
  // we can still restore unstaged changes to make it easier
  // to do manually.
  if (!ctx.shouldRevert) {
    return false
  }

  // Should be skipped when tasks fail
  if (ctx.errors.has(TaskError)) {
    return taskError()
  }
}

export const restoreOriginalStateEnabled = (ctx) =>
  !!ctx.shouldRevert &&
  !!ctx.shouldBackup &&
  (ctx.errors.has(FailOnChangesError) ||
    ctx.errors.has(TaskError) ||
    ctx.errors.has(RestoreUnstagedChangesError))

export const restoreOriginalStateSkipped = (ctx) => {
  // Should be skipped in case of unknown git errors
  if (ctx.errors.has(GitError) && !ctx.errors.has(RestoreUnstagedChangesError)) {
    return gitError()
  }
}

export const cleanupEnabled = (ctx) => ctx.shouldBackup

export const cleanupSkipped = (ctx) => {
  // "--fail-on-changes" was used, so we shouldn't drop the backup stash
  if (ctx.errors.has(FailOnChangesError) && !ctx.shouldRevert) {
    return true
  }

  /** Failed to restore hidden unstaged changes, shouldn't drop stash, @see restoreUnstagedChangesSkipped */
  if (ctx.errors.has(RestoreUnstagedChangesError) && !ctx.shouldRevert) {
    return gitError()
  }

  // Should be skipped in case of unknown git errors
  if (restoreOriginalStateSkipped(ctx)) {
    return gitError()
  }

  // Should be skipped when reverting to original state fails
  if (ctx.errors.has(RestoreOriginalStateError)) {
    return gitError()
  }
}
