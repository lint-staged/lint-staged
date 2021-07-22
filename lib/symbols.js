'use strict'

const ApplyEmptyCommitError = Symbol('ApplyEmptyCommitError')
const ConfigNotFoundError = new Error('Config could not be found')
const GetBackupStashError = Symbol('GetBackupStashError')
const GetStagedFilesError = Symbol('GetStagedFilesError')
const GitError = Symbol('GitError')
const GitRepoError = Symbol('GitRepoError')
const HideUnstagedChangesError = Symbol('HideUnstagedChangesError')
const InvalidOptionsError = new Error('Invalid Options')
const RestoreMergeStatusError = Symbol('RestoreMergeStatusError')
const RestoreOriginalStateError = Symbol('RestoreOriginalStateError')
const RestoreUnstagedChangesError = Symbol('RestoreUnstagedChangesError')
const TaskError = Symbol('TaskError')

module.exports = {
  ApplyEmptyCommitError,
  ConfigNotFoundError,
  GetBackupStashError,
  GetStagedFilesError,
  GitError,
  GitRepoError,
  InvalidOptionsError,
  HideUnstagedChangesError,
  RestoreMergeStatusError,
  RestoreOriginalStateError,
  RestoreUnstagedChangesError,
  TaskError,
}
