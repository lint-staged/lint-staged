import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import makeConsoleMock from 'consolemock'
import { beforeEach, describe, it, vi } from 'vitest'

import { InvalidOptionsError } from '../../lib/symbols.js'
import { validateOptions } from '../../lib/validateOptions.js'

describe('validateOptions', () => {
  const mockAccess = vi.spyOn(fs, 'access')
  beforeEach(() => {
    mockAccess.mockClear()
  })

  it('should resolve empty and missing config', async ({ expect }) => {
    expect.assertions(3)

    const logger = makeConsoleMock()

    mockAccess.mockImplementationOnce(async () => {})

    await expect(validateOptions({}, logger)).resolves.toBeUndefined()
    await expect(validateOptions(undefined, logger)).resolves.toBeUndefined()

    expect(logger.history()).toHaveLength(0)
  })

  describe('concurrent', () => {
    it.for([false, true, 1, 42, Infinity])(
      'Should accept valid value: $0',
      async (concurrent, { expect }) => {
        const logger = makeConsoleMock()
        await expect(validateOptions({ concurrent }, logger)).resolves.toBeUndefined()
      }
    )

    it.for([-1, 'foo', 'true', 'false', '10', 0.5, NaN])(
      'Should reject invalid value: $0',
      async (concurrent, { expect }) => {
        const logger = makeConsoleMock()
        await expect(validateOptions({ concurrent }, logger)).rejects.toThrow(InvalidOptionsError)
      }
    )
  })

  describe('cwd', () => {
    it('should resolve with valid absolute cwd option', async ({ expect }) => {
      expect.assertions(4)

      const logger = makeConsoleMock()

      await expect(validateOptions({ cwd: process.cwd() }, logger)).resolves.toBeUndefined()

      expect(mockAccess).toHaveBeenCalledTimes(1)
      expect(mockAccess).toHaveBeenCalledExactlyOnceWith(process.cwd(), constants.F_OK)

      expect(logger.history()).toHaveLength(0)
    })

    it('should resolve with valid relative cwd option', async ({ expect }) => {
      expect.assertions(4)

      const logger = makeConsoleMock()

      await expect(validateOptions({ cwd: 'test' }, logger)).resolves.toBeUndefined()

      expect(mockAccess).toHaveBeenCalledTimes(1)
      expect(mockAccess).toHaveBeenCalledExactlyOnceWith(
        path.join(process.cwd(), 'test'),
        constants.F_OK
      )

      expect(logger.history()).toHaveLength(0)
    })

    it('should reject with invalid cwd option', async ({ expect }) => {
      expect.assertions(4)

      const logger = makeConsoleMock()

      await expect(validateOptions({ cwd: 'non_existent' }, logger)).rejects.toThrow(
        InvalidOptionsError
      )

      expect(mockAccess).toHaveBeenCalledTimes(1)
      expect(mockAccess).toHaveBeenCalledExactlyOnceWith(
        path.join(process.cwd(), 'non_existent'),
        constants.F_OK
      )

      expect(logger.printHistory()).toMatchInlineSnapshot(`
        "
        ERROR ✖ Validation Error:

          Invalid value for option 'cwd': non_existent

          ENOENT: no such file or directory, access '${path.join(process.cwd(), 'non_existent')}'

        See https://github.com/lint-staged/lint-staged#command-line-flags"
      `)
    })
  })

  describe('maxArgLength', () => {
    it.for([undefined, null, 1, 8191, 131072, 262144, Infinity])(
      'Should accept valid value: $0',
      async (maxArgLength, { expect }) => {
        const logger = makeConsoleMock()
        await expect(validateOptions({ maxArgLength }, logger)).resolves.toBeUndefined()
      }
    )

    it.for([-Infinity, -1, 0, '100', 0.5, NaN])(
      'Should reject invalid value: $0',
      async (maxArgLength, { expect }) => {
        const logger = makeConsoleMock()
        await expect(validateOptions({ maxArgLength }, logger)).rejects.toThrow(InvalidOptionsError)
      }
    )
  })
})
