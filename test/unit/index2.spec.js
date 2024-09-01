import path from 'node:path'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import { getRepoRootPath } from '../__utils__/getRepoRootPath.js'

const MOCK_STAGED_FILE = path.join(getRepoRootPath(), 'test/__mocks__/sample.js')

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
  resolveGitRepo: jest.fn(async () => ({ topLevelDir: 'foo', gitConfigDir: 'bar' })),
}))

const { default: lintStaged } = await import('../../lib/index.js')

describe('lintStaged', () => {
  it('should catch errors from js function config', async () => {
    const logger = makeConsoleMock()
    const config = {
      '*': () => {
        throw new Error('failed config')
      },
    }

    expect.assertions(2)

    await expect(lintStaged({ config }, logger)).rejects.toThrow('failed config')

    expect(logger.printHistory()).toEqual('')
  })
})
