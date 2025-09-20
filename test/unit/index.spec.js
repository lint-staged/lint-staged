import makeConsoleMock from 'consolemock'
import { beforeEach, describe, it, vi } from 'vitest'

vi.mock('../../lib/debug.js', () => ({
  createDebug: vi.fn().mockReturnValue(vi.fn()),
  enableDebug: vi.fn(),
  isDebugEnv: vi.fn(),
}))

vi.mock('lilconfig', () => ({ lilconfig: vi.fn() }))

vi.mock('../../lib/getStagedFiles.js', () => ({ getStagedFiles: vi.fn() }))

vi.mock('../../lib/gitWorkflow.js', () => ({ GitWorkflow: vi.fn() }))

vi.mock('../../lib/validateOptions.js', () => ({
  validateOptions: vi.fn().mockImplementation(async () => void {}),
}))

const { enableDebug } = await import('../../lib/debug.js')
const { lilconfig } = await import('lilconfig')
const { getStagedFiles } = await import('../../lib/getStagedFiles.js')
const { default: lintStaged } = await import('../../lib/index.js')

// TODO: Never run tests in the project's WC because this might change source files git status

describe('lintStaged', () => {
  const logger = makeConsoleMock()

  beforeEach(() => {
    vi.resetAllMocks()
    logger.clearHistory()
  })

  it('should use lilconfig if no params are passed', async ({ expect }) => {
    expect.assertions(2)

    const config = { '*': 'mytask' }
    lilconfig({ config })

    await lintStaged(undefined, logger)

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR ✖ Failed to get staged files!"
    `)

    expect(enableDebug).not.toHaveBeenCalled()
  })

  it('should return true when passed', async ({ expect }) => {
    expect.assertions(1)

    getStagedFiles.mockImplementationOnce(async () => [{ filepath: 'sample.java', status: 'M' }])

    const config = { '*': 'node -e "process.exit(0)"' }

    await expect(lintStaged({ config, quiet: true }, logger)).resolves.toEqual(true)
  })

  it('should use use the console if no logger is passed', async ({ expect }) => {
    expect.assertions(1)

    lilconfig({ config: {} })

    const previousConsole = console
    const mockedConsole = makeConsoleMock()
    console = mockedConsole

    await lintStaged()

    expect(mockedConsole.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR ✖ Failed to get staged files!"
    `)

    console = previousConsole
  })

  it('should enable debugger', async ({ expect }) => {
    expect.assertions(1)

    lilconfig({ config: {} })

    await lintStaged({ debug: true }, logger)

    expect(enableDebug).toHaveBeenCalled()
  })
})
