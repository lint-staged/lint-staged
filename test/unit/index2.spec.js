import path from 'node:path'

import makeConsoleMock from 'consolemock'
import { describe, it, vi } from 'vitest'

import { getRepoRootPath } from '../__utils__/getRepoRootPath.js'

const MOCK_STAGED_FILE = path.join(getRepoRootPath(), 'test/__mocks__/sample.js')

vi.mock('../../lib/execGit.js', () => ({
  execGit: vi.fn(async () => {
    /** Mock fails by default */
    return ''
  }),
}))

vi.mock('../../lib/getStagedFiles.js', () => ({
  getStagedFiles: vi.fn(async () => [{ filepath: MOCK_STAGED_FILE, status: 'M' }]),
}))

vi.mock('../../lib/resolveGitRepo.js', () => ({
  resolveGitRepo: vi.fn(async () => ({ topLevelDir: 'foo', gitConfigDir: 'bar' })),
}))

const { default: lintStaged } = await import('../../lib/index.js')

describe('lintStaged', () => {
  it('should catch errors from js function config', async ({ expect }) => {
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
