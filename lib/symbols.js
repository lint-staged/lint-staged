'use strict'

const GitRepoError = Symbol('GitRepoError')

const GetStagedFilesError = Symbol('GetStagedFilesError')

const TaskError = Symbol('TaskError')

const GitError = Symbol('GitError')

const GetBackupStashError = Symbol('GetBackupStashError')

const HideUnstagedChangesError = Symbol('HideUnstagedChangesError')

const ApplyEmptyCommitError = Symbol('ApplyEmptyCommitError')

const RestoreUnstagedChangesError = Symbol('RestoreUnstagedChangesError')

const RestoreOriginalStateError = Symbol('RestoreOriginalStateError')

module.exports = {
  GitRepoError,
  GetStagedFilesError,
  ApplyEmptyCommitError,
  GetBackupStashError,
  GitError,
  HideUnstagedChangesError,
  RestoreOriginalStateError,
  RestoreUnstagedChangesError,
  TaskError
}
