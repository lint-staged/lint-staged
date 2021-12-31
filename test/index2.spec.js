import path from 'path'

import { Listr } from 'listr2'
import makeConsoleMock from 'consolemock'

jest.mock('listr2')
jest.mock('../lib/resolveGitRepo')

import lintStaged from '../lib/index'
import { resolveGitRepo } from '../lib/resolveGitRepo'
import { clearLoadConfigCache } from '../lib/loadConfig'

resolveGitRepo.mockImplementation(async () => ({ gitDir: 'foo', gitConfigDir: 'bar' }))

describe('lintStaged', () => {
  afterEach(() => {
    Listr.mockClear()
    clearLoadConfigCache()
  })

  it('should pass quiet flag to Listr', async () => {
    expect.assertions(1)
    await lintStaged(
      { configPath: path.join(__dirname, '__mocks__', 'my-config.json'), quiet: true },
      makeConsoleMock()
    )
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
        "nonTTYRenderer": "verbose",
        "registerSignalListeners": false,
        "renderer": "silent",
      }
    `)
  })

  it('should pass debug flag to Listr', async () => {
    expect.assertions(1)
    await lintStaged(
      {
        configPath: path.join(__dirname, '__mocks__', 'my-config.json'),
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
