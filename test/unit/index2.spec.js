import path from 'node:path'

import makeConsoleMock from 'consolemock'
import { describe, it, vi } from 'vitest'

import { assertGitVersion } from '../../lib/assertGitVersion.js'
import { getRepoRootPath } from '../__utils__/getRepoRootPath.js'

const MOCK_STAGED_FILE = path.join(getRepoRootPath(), 'test/__mocks__/sample.js')

vi.mock('../../lib/assertGitVersion.js', async (importOriginal) => ({
  ...(await importOriginal()),
  assertGitVersion: vi.fn(async () => true),
}))

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

  it('should throw when using too old Git version', async ({ expect }) => {
    const logger = makeConsoleMock()

    vi.mocked(assertGitVersion).mockReturnValueOnce(false)

    await expect(() => lintStaged(undefined, logger)).rejects.toThrow(
      'lint-staged requires at least Git version 2.27.0'
    )
  })
})
