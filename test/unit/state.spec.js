import { describe, it } from 'vitest'

import {
  applyModificationsSkipped,
  cleanupSkipped,
  getInitialState,
  restoreOriginalStateEnabled,
  restoreOriginalStateSkipped,
  restoreUnstagedChangesSkipped,
} from '../../lib/state.js'
import {
  GitError,
  RestoreOriginalStateError,
  RestoreUnstagedChangesError,
  TaskError,
} from '../../lib/symbols.js'

describe('applyModificationsSkipped', () => {
  it('should return false when reverting is disabled', ({ expect }) => {
    const state = getInitialState()
    const result = applyModificationsSkipped({
      ...state,
      shouldRevert: false,
    })

    expect(result).toEqual(false)
  })

  it('should return false when backup is disabled', ({ expect }) => {
    const state = getInitialState()
    const result = applyModificationsSkipped({
      ...state,
      shouldBackup: false,
    })

    expect(result).toEqual(false)
  })

  it('should return error message when there is an unknown git error', ({ expect }) => {
    const state = getInitialState()
    const result = applyModificationsSkipped({
      ...state,
      shouldBackup: true,
      errors: new Set([GitError]),
    })

    expect(typeof result === 'string').toEqual(true)
  })
})

describe('restoreUnstagedChangesSkipped', () => {
  it('should return error message when there is an unknown git error', ({ expect }) => {
    const state = getInitialState()
    const result = restoreUnstagedChangesSkipped({
      ...state,
      errors: new Set([GitError]),
    })

    expect(typeof result === 'string').toEqual(true)
  })
})

describe('restoreOriginalStateEnabled', () => {
  it('should return false by default', ({ expect }) => {
    const state = getInitialState()
    const result = restoreOriginalStateEnabled({
      ...state,
    })

    expect(result).toEqual(false)
  })

  it('should return true when backup enabled and there are task errors', ({ expect }) => {
    const state = getInitialState()
    const result = restoreOriginalStateEnabled({
      ...state,
      shouldBackup: true,
      errors: new Set([TaskError]),
    })

    expect(result).toEqual(true)
  })

  it('should return true when backup enabled and unstaged changes failed to restore', ({
    expect,
  }) => {
    const state = getInitialState()
    const result = restoreOriginalStateEnabled({
      ...state,
      shouldBackup: true,
      shouldRevert: true,
      errors: new Set([RestoreUnstagedChangesError]),
    })

    expect(result).toEqual(true)
  })

  it('should return false when reverting is disabled', ({ expect }) => {
    const state = getInitialState()
    const result = restoreOriginalStateEnabled({
      ...state,
      shouldBackup: true,
      shouldRevert: false,
      errors: new Set([TaskError]),
    })

    expect(result).toEqual(false)
  })
})

describe('restoreOriginalStateSkipped', () => {
  it('should return error message when there is an unknown git error', ({ expect }) => {
    const state = getInitialState()
    const result = restoreOriginalStateSkipped({
      ...state,
      errors: new Set([GitError]),
    })

    expect(typeof result === 'string').toEqual(true)
  })
})

describe('shouldSkipCleanup', () => {
  it('should return error message when reverting to original state fails', ({ expect }) => {
    const state = getInitialState()
    const result = cleanupSkipped({
      ...state,
      errors: new Set([RestoreOriginalStateError]),
    })

    expect(typeof result === 'string').toEqual(true)
  })
})
