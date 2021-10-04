import makeConsoleMock from 'consolemock'
import { promises as fs, constants } from 'fs'

import validateOptions from '../lib/validateOptions'
import { InvalidOptionsError } from '../lib/symbols'

describe('validateOptions', () => {
  const mockAccess = jest.spyOn(fs, 'access')
  mockAccess.mockImplementation(async () => {})

  beforeEach(() => {
    mockAccess.mockClear()
  })

  it('should resolve empty and missing config', async () => {
    expect.assertions(3)

    const logger = makeConsoleMock()

    await expect(validateOptions({}, logger)).resolves.toBeUndefined()
    await expect(validateOptions(undefined, logger)).resolves.toBeUndefined()

    expect(logger.history()).toHaveLength(0)
  })

  it('should resolve with valid string-valued shell option', async () => {
    expect.assertions(4)

    const logger = makeConsoleMock()

    await expect(validateOptions({ shell: '/bin/sh' }, logger)).resolves.toBeUndefined()

    expect(mockAccess).toHaveBeenCalledTimes(1)
    expect(mockAccess).toHaveBeenCalledWith('/bin/sh', constants.X_OK)

    expect(logger.history()).toHaveLength(0)
  })

  it('should reject with invalid string-valued shell option', async () => {
    expect.assertions(5)

    const logger = makeConsoleMock()

    mockAccess.mockImplementationOnce(() => Promise.reject(new Error('Failed')))

    await expect(validateOptions({ shell: '/bin/sh' }, logger)).rejects.toThrowError(
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
