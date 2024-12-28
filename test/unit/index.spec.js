import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

jest.unstable_mockModule('debug', () => {
  const debug = jest.fn().mockReturnValue(jest.fn())
  debug.enable = jest.fn()

  return { default: debug }
})

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

// TODO: Never run tests in the project's WC because this might change source files git status

describe('lintStaged', () => {
  const logger = makeConsoleMock()

  // re-import to clear module cache
  let lintStaged

  beforeEach(async () => {
    lintStaged = (await import('../../lib/index.js')).default
    jest.clearAllMocks()
    logger.clearHistory()
  })

  it('should use lilconfig if no params are passed', async () => {
    expect.assertions(2)

    await lintStaged({ config: { '*': 'mytask' } }, logger)

    expect(logger.printHistory()).toMatch('Failed to get staged files!')

    expect(logger.printHistory()).toMatch('See debug logs for more info')
  })

  it("shouldn't output debug log path quiet", async () => {
    expect.assertions(1)

    await lintStaged({ config: { '*': 'mytask' }, quiet: true }, logger)

    expect(logger.printHistory()).not.toMatch('See debug logs for more info')
  })

  it('should return true when passed', async () => {
    expect.assertions(1)

    getStagedFiles.mockImplementationOnce(async () => ['sample.java'])

    const config = { '*': 'node -e "process.exit(0)"' }

    await expect(lintStaged({ config, quiet: true }, logger)).resolves.toEqual(true)
  })

  it('should use the console if no logger is passed', async () => {
    expect.assertions(1)

    lilconfig({ config: {} })

    const previousConsole = console
    const mockedConsole = makeConsoleMock()
    console = mockedConsole

    await lintStaged()

    expect(mockedConsole.printHistory()).toMatch('Failed to get staged files!')

    console = previousConsole
  })

  it('should enable debugger', async () => {
    // re-import to clear module cache
    const { default: lintStaged } = await import('../../lib/index.js')

    expect.assertions(1)

    getStagedFiles.mockImplementationOnce(async () => ['sample.java'])

    const config = { '*': 'node -e "process.exit(0)"' }

    await expect(lintStaged({ config, debug: true }, logger)).resolves.toEqual(true)
  })
})
