import makeConsoleMock from 'consolemock'
import { describe, it, vi } from 'vitest'

vi.mock('../../lib/execGit.js', () => ({
  execGit: vi.fn(async () => {}),
}))

vi.mock('../../lib/validateOptions.js', () => ({
  validateOptions: vi.fn(async () => {}),
}))

vi.mock('../../lib/runAll.js', () => ({
  runAll: vi.fn(async () => {}),
}))

const { default: lintStaged } = await import('../../lib/index.js')
const { runAll } = await import('../../lib/runAll.js')
const { getInitialState } = await import('../../lib/state.js')
const { ApplyEmptyCommitError, ConfigNotFoundError, GitError } = await import(
  '../../lib/symbols.js'
)

describe('lintStaged', () => {
  it('should log error when configuration not found', async ({ expect }) => {
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

  it('should log error when preventing empty commit', async ({ expect }) => {
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

  it('should log error and git stash message when a git operation failed', async ({ expect }) => {
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
      ERROR Any lost modifications can be restored from a git stash:

        > git stash list
        stash@{0}: automatic lint-staged backup
        > git stash apply --index stash@{0}
      "
    `)
  })

  it('should log error without git stash message when a git operation failed and backup disabled', async ({
    expect,
  }) => {
    const ctx = getInitialState()
    ctx.shouldBackup = false
    ctx.errors.add(GitError)
    runAll.mockImplementationOnce(async () => {
      throw { ctx }
    })

    const logger = makeConsoleMock()

    await expect(lintStaged({}, logger)).resolves.toEqual(false)

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR 
        ✖ lint-staged failed due to a git error."
    `)

    expect(logger.printHistory()).not.toMatch(
      'Any lost modifications can be restored from a git stash'
    )
  })

  it('should throw when context is malformed', async ({ expect }) => {
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

  it.for([
    ['darwin', 262144 / 2],
    ['win32', 8191 / 2],
    ['others', 131072 / 2],
  ])(
    'should use default max arg length of $1 on $2',
    async ([platform, maxArgLength], { expect }) => {
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
