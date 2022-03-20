import path from 'path'
import { fileURLToPath } from 'url'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import { mockListr } from './utils/mockListr.js'

const { Listr } = await mockListr()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MOCK_CONFIG_FILE = path.join(__dirname, '__mocks__', 'my-config.json')
const MOCK_STAGED_FILE = path.resolve(__dirname, '__mocks__', 'sample.js')

jest.unstable_mockModule('../lib/getStagedFiles.js', () => ({
  getStagedFiles: jest.fn(async () => [MOCK_STAGED_FILE]),
}))

jest.unstable_mockModule('../lib/resolveGitRepo.js', () => ({
  resolveGitRepo: jest.fn(async () => ({ gitDir: 'foo', gitConfigDir: 'bar' })),
}))

const { default: lintStaged } = await import('../lib/index.js')

describe.skip('lintStaged', () => {
  afterEach(() => {
    Listr.mockClear()
  })

  it('should pass quiet flag to Listr', async () => {
    expect.assertions(1)
    await lintStaged(
      { configPath: path.join(__dirname, '__mocks__', 'my-config.json'), quiet: true },
      makeConsoleMock()
    )

    expect(Listr).toHaveBeenCalledTimes(1)

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
