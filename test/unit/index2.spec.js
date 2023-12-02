import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import { getMockListr2 } from './__utils__/getMockListr2.js'

const { Listr } = await getMockListr2()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MOCK_CONFIG_FILE = path.join(__dirname, '__mocks__', 'my-config.json')
const MOCK_STAGED_FILE = path.resolve(__dirname, '__mocks__', 'sample.js')

jest.unstable_mockModule('../../lib/execGit.js', () => ({
  execGit: jest.fn(async () => {
    /** Mock fails by default */
    return ''
  }),
}))

jest.unstable_mockModule('../../lib/getStagedFiles.js', () => ({
  getStagedFiles: jest.fn(async () => [MOCK_STAGED_FILE]),
}))

jest.unstable_mockModule('../../lib/resolveGitRepo.js', () => ({
  resolveGitRepo: jest.fn(async () => ({ gitDir: 'foo', gitConfigDir: 'bar' })),
}))

const { default: lintStaged } = await import('../../lib/index.js')

describe('lintStaged', () => {
  afterEach(() => {
    Listr.mockClear()
  })

  it('should pass quiet flag to Listr', async () => {
    expect.assertions(1)

    await lintStaged({ configPath: MOCK_CONFIG_FILE, quiet: true }, makeConsoleMock())

    expect(Listr.mock.calls[0][1]).toMatchObject({
      fallbackRenderer: 'silent',
      renderer: 'silent',
    })
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

    expect(Listr.mock.calls[0][1]).toMatchObject({
      fallbackRenderer: 'test',
      renderer: 'test',
    })
  })

  it.only('should catch errors from js function config', async () => {
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

    expect(logger.printHistory()).toEqual('')
  })
})
