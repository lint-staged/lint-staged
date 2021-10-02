import {
  applyModificationsSkipped,
  cleanupSkipped,
  restoreOriginalStateSkipped,
  restorePartialChangesSkipped,
} from '../lib/state'
import { GitError } from '../lib/symbols'

describe('applyModificationsSkipped', () => {
  it('should return false when backup is disabled', () => {
    const result = applyModificationsSkipped({ shouldReset: false })
    expect(result).toEqual(false)
  })

  it('should return error message when there is an unkown git error', () => {
    const result = applyModificationsSkipped({ shouldReset: true, errors: new Set([GitError]) })
    expect(typeof result === 'string').toEqual(true)
  })
})

describe('restorePartialChangesSkipped', () => {
  it('should return error message when there is an unkown git error', () => {
    const result = restorePartialChangesSkipped({ errors: new Set([GitError]) })
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
    const result = cleanupSkipped({ errors: new Set([GitError]) })
    expect(typeof result === 'string').toEqual(true)
  })
})
