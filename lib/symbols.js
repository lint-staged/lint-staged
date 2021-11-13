export const ApplyEmptyCommitError = Symbol('ApplyEmptyCommitError')

export const ConfigNotFoundError = new Error('Config could not be found')

export const GetBackupStashError = Symbol('GetBackupStashError')

export const GetStagedFilesError = Symbol('GetStagedFilesError')

export const GitError = Symbol('GitError')

export const GitRepoError = Symbol('GitRepoError')

export const HideUnstagedChangesError = Symbol('HideUnstagedChangesError')

export const InvalidOptionsError = new Error('Invalid Options')

export const RestoreMergeStatusError = Symbol('RestoreMergeStatusError')

export const RestoreOriginalStateError = Symbol('RestoreOriginalStateError')

export const RestoreUnstagedChangesError = Symbol('RestoreUnstagedChangesError')

export const TaskError = Symbol('TaskError')
