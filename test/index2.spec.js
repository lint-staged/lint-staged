import path from 'path'

import { Listr } from 'listr2'
import makeConsoleMock from 'consolemock'

import lintStaged from '../lib/index'

jest.mock('listr2')

const MOCK_CONFIG_FILE = path.join(__dirname, '__mocks__', 'my-config.json')
const MOCK_STAGED_FILE = path.resolve(__dirname, '__mocks__', 'sample.js')

jest.mock('../lib/getStagedFiles', () => ({
  getStagedFiles: async () => [MOCK_STAGED_FILE],
}))

jest.mock('../lib/resolveConfig', () => ({
  /** Unfortunately necessary due to non-ESM tests. */
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))

jest.mock('../lib/resolveGitRepo', () => ({
  resolveGitRepo: async () => ({ gitDir: 'foo', gitConfigDir: 'bar' }),
}))

describe('lintStaged', () => {
  afterEach(() => {
    Listr.mockClear()
  })

  it('should pass quiet flag to Listr', async () => {
    expect.assertions(1)

    await lintStaged({ configPath: MOCK_CONFIG_FILE, quiet: true }, makeConsoleMock())

    expect(Listr.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "ctx": Object {
          "errors": Set {},
          "hasPartiallyStagedFiles": null,
          "output": Array [],
          "quiet": true,
          "shouldBackup": true,
        },
        "exitOnError": false,
        "nonTTYRenderer": "silent",
        "registerSignalListeners": false,
        "renderer": "silent",
      }
    `)
  })

  it('should pass debug flag to Listr', async () => {
    expect.assertions(1)
    await lintStaged(
      {
        configPath: MOCK_CONFIG_FILE,
        debug: true,
      },
      makeConsoleMock()
    )

    expect(Listr.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "ctx": Object {
          "errors": Set {},
          "hasPartiallyStagedFiles": null,
          "output": Array [],
          "quiet": false,
          "shouldBackup": true,
        },
        "exitOnError": false,
        "nonTTYRenderer": "verbose",
        "registerSignalListeners": false,
        "renderer": "verbose",
      }
    `)
  })

  it('should catch errors from js function config', async () => {
    const logger = makeConsoleMock()
    const config = {
      '*': () => {
        throw new Error('failed config')
      },
    }

    expect.assertions(2)
    await expect(lintStaged({ config }, logger)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"failed config"`
    )

    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
  })
})
