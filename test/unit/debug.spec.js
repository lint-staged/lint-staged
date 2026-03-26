import makeConsoleMock from 'consolemock'
import { describe, expect, it, suite, vi } from 'vitest'

suite('debug', async () => {
  describe('enableDebug', () => {
    it('should enable debugging', async ({ expect }) => {
      const { enableDebug } = await vi.importActual('../../lib/debug.js')
      expect(enableDebug()).toBe(undefined)

      const logger = makeConsoleMock()
      expect(enableDebug(logger)).toBe(undefined)

      expect(logger.printHistory()).toBe('')
    })
  })

  describe('createDebug', () => {
    it('should create debug logger', async () => {
      const { createDebug, enableDebug } = await vi.importActual('../../lib/debug.js')

      const logger = makeConsoleMock()
      enableDebug(logger)

      const debug = createDebug('vitest')
      debug('Testing 1… 2… 3…')

      expect(logger.printHistory()).toMatch('DEBUG vitest: Testing 1… 2… 3…')
    })
  })
})
