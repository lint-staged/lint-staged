import {
  applyModificationsSkipped,
  cleanupSkipped,
  restoreOriginalStateSkipped,
  restoreUnstagedChangesSkipped,
} from '../../lib/state.js'
import { GitError, RestoreOriginalStateError } from '../../lib/symbols.js'

describe('applyModificationsSkipped', () => {
  it('should return false when backup is disabled', () => {
    const result = applyModificationsSkipped({ shouldBackup: false })
    expect(result).toEqual(false)
  })

  it('should return error message when there is an unkown git error', () => {
    const result = applyModificationsSkipped({ shouldBackup: true, errors: new Set([GitError]) })
    expect(typeof result === 'string').toEqual(true)
  })
})

describe('restoreUnstagedChangesSkipped', () => {
  it('should return error message when there is an unkown git error', () => {
    const result = restoreUnstagedChangesSkipped({ errors: new Set([GitError]) })
    expect(typeof result === 'string').toEqual(true)
  })
})

describe('restoreOriginalStateSkipped', () => {
  it('should return error message when there is an unkown git error', () => {
    const result = restoreOriginalStateSkipped({ errors: new Set([GitError]) })
    expect(typeof result === 'string').toEqual(true)
  })
})

describe('shouldSkipCleanup', () => {
  it('should return error message when reverting to original state fails', () => {
    const result = cleanupSkipped({ errors: new Set([RestoreOriginalStateError]) })
    expect(typeof result === 'string').toEqual(true)
  })
})
