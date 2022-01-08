import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'
import fs from 'fs-extra'

import lintStaged from '../lib/index.js'

import { createTempDir } from './utils/tempDir.js'
import { prettierWrite } from './fixtures/configs.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('integration', () => {
  test('fails when not in a git directory', async () => {
    const nonGitDir = await createTempDir()
    const logger = makeConsoleMock()
    await expect(lintStaged({ ...prettierWrite, cwd: nonGitDir }, logger)).resolves.toEqual(false)
    expect(logger.printHistory()).toMatch('Current directory is not a git directory')
    await fs.remove(nonGitDir)
  })

  test('fails without output when not in a git directory and quiet', async () => {
    const nonGitDir = await createTempDir()
    const logger = makeConsoleMock()
    await expect(
      lintStaged({ ...prettierWrite, cwd: nonGitDir, quiet: true }, logger)
    ).resolves.toEqual(false)
    expect(logger.printHistory()).toBeFalsy()
    await fs.remove(nonGitDir)
  })
})
