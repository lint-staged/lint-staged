import makeConsoleMock from 'consolemock'
import { describe, expect, it, suite, vi } from 'vitest'

suite('debug', async () => {
  const logger = makeConsoleMock()

  const { createDebug, enableDebug } = await vi.importActual('../../lib/debug.js')

  describe('enableDebug', () => {
    it('should enable debugging', ({ expect }) => {
      expect(enableDebug(logger)).toBe(undefined)
      expect(enableDebug(logger)).toBe(undefined)

      expect(logger.printHistory()).toBe('')
    })
  })

  describe('createDebug', () => {
    it('should create debug logger', () => {
      const debug = createDebug('vitest')
      debug('Testing 1… 2… 3…')

      expect(logger.printHistory()).toMatch('DEBUG vitest: Testing 1… 2… 3…')
    })
  })
})
