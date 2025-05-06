import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import { InvalidOptionsError } from '../../lib/symbols.js'
import { validateOptions } from '../../lib/validateOptions.js'

describe('validateOptions', () => {
  const mockAccess = jest.spyOn(fs, 'access')
  beforeEach(() => {
    mockAccess.mockClear()
  })

  it('should resolve empty and missing config', async () => {
    expect.assertions(3)

    const logger = makeConsoleMock()

    mockAccess.mockImplementationOnce(async () => {})

    await expect(validateOptions({}, logger)).resolves.toBeUndefined()
    await expect(validateOptions(undefined, logger)).resolves.toBeUndefined()

    expect(logger.history()).toHaveLength(0)
  })

  describe('cwd', () => {
    it('should resolve with valid absolute cwd option', async () => {
      expect.assertions(4)

      const logger = makeConsoleMock()

      await expect(validateOptions({ cwd: process.cwd() }, logger)).resolves.toBeUndefined()

      expect(mockAccess).toHaveBeenCalledTimes(1)
      expect(mockAccess).toHaveBeenCalledWith(process.cwd(), constants.F_OK)

      expect(logger.history()).toHaveLength(0)
    })

    it('should resolve with valid relative cwd option', async () => {
      expect.assertions(4)

      const logger = makeConsoleMock()

      await expect(validateOptions({ cwd: 'test' }, logger)).resolves.toBeUndefined()

      expect(mockAccess).toHaveBeenCalledTimes(1)
      expect(mockAccess).toHaveBeenCalledWith(path.join(process.cwd(), 'test'), constants.F_OK)

      expect(logger.history()).toHaveLength(0)
    })

    it('should reject with invalid cwd option', async () => {
      expect.assertions(4)

      const logger = makeConsoleMock()

      await expect(validateOptions({ cwd: 'non_existent' }, logger)).rejects.toThrow(
        InvalidOptionsError
      )

      expect(mockAccess).toHaveBeenCalledTimes(1)
      expect(mockAccess).toHaveBeenCalledWith(
        path.join(process.cwd(), 'non_existent'),
        constants.F_OK
      )

      // eslint-disable-next-line jest/no-interpolation-in-snapshots
      expect(logger.printHistory()).toMatchInlineSnapshot(`
        "
        ERROR ✖ Validation Error:

          Invalid value for option 'cwd': non_existent

          ENOENT: no such file or directory, access '${path.join(process.cwd(), 'non_existent')}'

        See https://github.com/okonet/lint-staged#command-line-flags"
      `)
    })
  })

  describe('shell', () => {
    it('should resolve with valid string-valued shell option', async () => {
      expect.assertions(4)

      const logger = makeConsoleMock()

      mockAccess.mockImplementationOnce(async () => {})

      await expect(validateOptions({ shell: '/bin/sh' }, logger)).resolves.toBeUndefined()

      expect(mockAccess).toHaveBeenCalledTimes(1)
      expect(mockAccess).toHaveBeenCalledWith('/bin/sh', constants.X_OK)

      expect(logger.history()).toHaveLength(0)
    })

    it('should reject with invalid string-valued shell option', async () => {
      expect.assertions(5)

      const logger = makeConsoleMock()

      mockAccess.mockImplementationOnce(() => Promise.reject(new Error('Failed')))

      await expect(validateOptions({ shell: '/bin/sh' }, logger)).rejects.toThrow(
        InvalidOptionsError
      )

      expect(mockAccess).toHaveBeenCalledTimes(1)
      expect(mockAccess).toHaveBeenCalledWith('/bin/sh', constants.X_OK)

      expect(logger.history()).toHaveLength(1)
      expect(logger.printHistory()).toMatchInlineSnapshot(`
        "
        ERROR ✖ Validation Error:

          Invalid value for option 'shell': /bin/sh

          Failed

        See https://github.com/okonet/lint-staged#command-line-flags"
      `)
    })
  })
})
