import makeConsoleMock from 'consolemock'
import { jest } from '@jest/globals'

jest.unstable_mockModule('lilconfig', () => ({
  lilconfig: jest.fn(),
}))

jest.unstable_mockModule('../../lib/getStagedFiles.js', () => ({ getStagedFiles: jest.fn() }))

jest.unstable_mockModule('../../lib/gitWorkflow.js', () => ({ GitWorkflow: jest.fn() }))

jest.unstable_mockModule('../../lib/validateOptions.js', () => ({
  validateOptions: jest.fn().mockImplementation(async () => void {}),
}))

const { lilconfig } = await import('lilconfig')
const { getStagedFiles } = await import('../../lib/getStagedFiles.js')
const { default: lintStaged } = await import('../../lib/index.js')

// TODO: Never run tests in the project's WC because this might change source files git status

describe('lintStaged', () => {
  const logger = makeConsoleMock()

  beforeEach(() => {
    logger.clearHistory()
  })

  it('should use lilconfig if no params are passed', async () => {
    expect.assertions(1)

    const config = { '*': 'mytask' }
    lilconfig({ config })

    await lintStaged(undefined, logger)

    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR ✖ Failed to get staged files!"
    `)
  })

  it('should return true when passed', async () => {
    expect.assertions(1)

    getStagedFiles.mockImplementationOnce(async () => ['sample.java'])

    const config = { '*': 'node -e "process.exit(0)"' }

    await expect(lintStaged({ config, quiet: true }, logger)).resolves.toEqual(true)
  })

  it('should use use the console if no logger is passed', async () => {
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
})
