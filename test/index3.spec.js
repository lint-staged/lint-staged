import makeConsoleMock from 'consolemock'

import lintStaged from '../lib/index'
import { runAll } from '../lib/runAll'
import { getInitialState } from '../lib/state'
import { ApplyEmptyCommitError, ConfigNotFoundError, GitError } from '../lib/symbols'

jest.mock('../lib/validateOptions.js', () => ({
  validateOptions: jest.fn(async () => {}),
}))

jest.mock('../lib/runAll.js', () => ({
  runAll: jest.fn(async () => {}),
}))

describe('lintStaged', () => {
  it('should log error when configuration not found', async () => {
    const ctx = getInitialState()
    ctx.errors.add(ConfigNotFoundError)
    runAll.mockImplementationOnce(async () => {
      throw { ctx }
    })

    const logger = makeConsoleMock()

    await expect(lintStaged({}, logger)).resolves.toEqual(false)

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR ✖ No valid configuration found."
    `)
  })

  it('should log error when preventing empty commit', async () => {
    const ctx = getInitialState()
    ctx.errors.add(ApplyEmptyCommitError)
    runAll.mockImplementationOnce(async () => {
      throw { ctx }
    })

    const logger = makeConsoleMock()

    await expect(lintStaged({}, logger)).resolves.toEqual(false)

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN 
        ⚠ lint-staged prevented an empty git commit.
        Use the --allow-empty option to continue, or check your task configuration
      "
    `)
  })

  it('should log error when preventing empty commit', async () => {
    const ctx = getInitialState()
    ctx.errors.add(ApplyEmptyCommitError)
    runAll.mockImplementationOnce(async () => {
      throw { ctx }
    })

    const logger = makeConsoleMock()

    await expect(lintStaged({}, logger)).resolves.toEqual(false)

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      WARN 
        ⚠ lint-staged prevented an empty git commit.
        Use the --allow-empty option to continue, or check your task configuration
      "
    `)
  })

  it('should log error when a git operation failed', async () => {
    const ctx = getInitialState()
    ctx.shouldBackup = true
    ctx.errors.add(GitError)
    runAll.mockImplementationOnce(async () => {
      throw { ctx }
    })

    const logger = makeConsoleMock()

    await expect(lintStaged({}, logger)).resolves.toEqual(false)

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR 
        ✖ lint-staged failed due to a git error.
      ERROR   Any lost modifications can be restored from a git stash:

          > git stash list
          stash@{0}: automatic lint-staged backup
          > git stash apply --index stash@{0}
      "
    `)
  })

  it('should throw when context is malformed', async () => {
    expect.assertions(2)

    const testError = Symbol()

    runAll.mockImplementationOnce(async () => {
      throw testError
    })

    const logger = makeConsoleMock()

    await lintStaged({}, logger).catch((error) => {
      expect(error).toEqual(testError)
    })

    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
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
