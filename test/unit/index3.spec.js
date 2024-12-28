import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import {
  NO_CONFIGURATION,
  PREVENTED_EMPTY_COMMIT,
  RESTORE_STASH_EXAMPLE,
} from '../../lib/messages.js'

jest.unstable_mockModule('../../lib/validateOptions.js', () => ({
  validateOptions: jest.fn(async () => {}),
}))

jest.unstable_mockModule('../../lib/runAll.js', () => ({
  runAll: jest.fn(async () => {}),
}))

const { default: lintStaged } = await import('../../lib/index.js')
const { runAll } = await import('../../lib/runAll.js')
const { getInitialState } = await import('../../lib/state.js')
const { ApplyEmptyCommitError, ConfigNotFoundError, GitError } = await import(
  '../../lib/symbols.js'
)

describe('lintStaged', () => {
  it('should log error when configuration not found', async () => {
    const ctx = getInitialState()
    ctx.errors.add(ConfigNotFoundError)
    runAll.mockImplementationOnce(async () => {
      throw { ctx }
    })

    const logger = makeConsoleMock()

    await expect(lintStaged({}, logger)).resolves.toEqual(false)

    expect(logger.printHistory()).toMatch(NO_CONFIGURATION)
  })

  it('should log error when preventing empty commit', async () => {
    const ctx = getInitialState()
    ctx.errors.add(ApplyEmptyCommitError)
    runAll.mockImplementationOnce(async () => {
      throw { ctx }
    })

    const logger = makeConsoleMock()

    await expect(lintStaged({}, logger)).resolves.toEqual(false)

    expect(logger.printHistory()).toMatch(PREVENTED_EMPTY_COMMIT)
  })

  it('should log error and git stash message when a git operation failed', async () => {
    const ctx = getInitialState()
    ctx.shouldBackup = true
    ctx.errors.add(GitError)
    runAll.mockImplementationOnce(async () => {
      throw { ctx }
    })

    const logger = makeConsoleMock()

    await expect(lintStaged({}, logger)).resolves.toEqual(false)

    expect(logger.printHistory()).toMatch(RESTORE_STASH_EXAMPLE)
  })

  it('should log error without git stash message when a git operation failed and backup disabled', async () => {
    const ctx = getInitialState()
    ctx.shouldBackup = false
    ctx.errors.add(GitError)
    runAll.mockImplementationOnce(async () => {
      throw { ctx }
    })

    const logger = makeConsoleMock()

    await expect(lintStaged({}, logger)).resolves.toEqual(false)

    expect(logger.printHistory()).toMatch('lint-staged failed due to a git error.')

    expect(logger.printHistory()).not.toMatch(
      'Any lost modifications can be restored from a git stash'
    )
  })

  it('should throw when context is malformed', async () => {
    expect.assertions(2)

    const testError = Symbol()

    runAll.mockImplementationOnce(async () => {
      throw testError
    })

    const logger = makeConsoleMock()

    await lintStaged({}, logger).catch((error) => {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(error).toEqual(testError)
    })

    expect(logger.printHistory()).toMatch('See debug logs for more info')
  })

  it('should not output debug log path when using quiet', async () => {
    expect.assertions(2)

    runAll.mockImplementationOnce(async () => {
      throw new Error()
    })

    const logger = makeConsoleMock()

    await expect(lintStaged({ quiet: true }, logger)).rejects.toThrow()

    expect(logger.printHistory()).toMatch('')
  })

  it.each`
    platform    | maxArgLength
    ${'darwin'} | ${262144 / 2}
    ${'win32'}  | ${8191 / 2}
    ${'others'} | ${131072 / 2}
  `(
    'should use default max arg length of $maxArgLength on $platform',
    async ({ platform, maxArgLength }) => {
      const realPlatform = process.platform
      Object.defineProperty(process, 'platform', {
        value: platform,
      })

      await lintStaged({}, makeConsoleMock())

      expect(runAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ maxArgLength }),
        expect.objectContaining({})
      )

      Object.defineProperty(process, 'platform', {
        value: realPlatform,
      })
    }
  )
})
