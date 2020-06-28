import { Listr } from 'listr2'
import makeConsoleMock from 'consolemock'
import path from 'path'

jest.mock('listr2')
jest.mock('../lib/resolveGitRepo')
jest.mock('../lib/chunkFiles')

// eslint-disable-next-line import/first
import lintStaged from '../lib/index'
import resolveGitRepo from '../lib/resolveGitRepo'
import chunkFiles from '../lib/chunkFiles'

resolveGitRepo.mockImplementation(async () => ({ gitDir: 'foo', gitConfigDir: 'bar' }))
chunkFiles.mockImplementation(() => [['./a-ok']])

describe('lintStaged', () => {
  afterEach(() => {
    Listr.mockClear()
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
          "matchedFileChunks": Array [
            Array [
              "./a-ok",
            ],
          ],
          "output": Array [],
          "quiet": true,
          "shouldBackup": true,
        },
        "exitOnError": false,
        "nonTTYRenderer": "verbose",
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
          "matchedFileChunks": Array [
            Array [
              "./a-ok",
            ],
          ],
          "output": Array [],
          "quiet": false,
          "shouldBackup": true,
        },
        "exitOnError": false,
        "nonTTYRenderer": "verbose",
        "renderer": "verbose",
      }
    `)
  })
})
