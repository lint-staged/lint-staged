import { lilconfig } from 'lilconfig'
import makeConsoleMock from 'consolemock'

import { getStagedFiles } from '../../lib/getStagedFiles.js'
import lintStaged from '../../lib/index.js'

jest.unmock('execa')

jest.mock('lilconfig', () => {
  const actual = jest.requireActual('lilconfig')
  return {
    lilconfig: jest.fn((name, options) => actual.lilconfig(name, options)),
  }
})

const mockLilConfig = (result) => {
  lilconfig.mockImplementationOnce(() => ({
    search: () => Promise.resolve(result),
  }))
}

/**
 * This converts paths into `file://` urls, but this doesn't
 * work with `import()` when using babel + jest.
 */
jest.mock('node:url', () => ({
  pathToFileURL: (path) => path,
}))

jest.mock('../../lib/getStagedFiles.js')
jest.mock('../../lib/gitWorkflow.js')
jest.mock('../../lib/resolveConfig.js', () => ({
  /** Unfortunately necessary due to non-ESM tests. */
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))
jest.mock('../../lib/validateOptions.js', () => ({
  validateOptions: jest.fn().mockImplementation(async () => {}),
}))

// TODO: Never run tests in the project's WC because this might change source files git status

describe('lintStaged', () => {
  const logger = makeConsoleMock()

  beforeEach(() => {
    logger.clearHistory()
  })

  it('should use lilconfig if no params are passed', async () => {
    expect.assertions(1)

    const config = { '*': 'mytask' }
    mockLilConfig({ config })

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

    mockLilConfig({ config: {} })

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
