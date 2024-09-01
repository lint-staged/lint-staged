import fs from 'node:fs/promises'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import lintStaged from '../../lib/index.js'
import { createTempDir } from '../__utils__/createTempDir.js'
import { prettierWrite } from './__fixtures__/configs.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test('fails when not in a git directory', async () => {
    const nonGitDir = await createTempDir()
    const logger = makeConsoleMock()
    await expect(lintStaged({ ...prettierWrite, cwd: nonGitDir }, logger)).resolves.toEqual(false)
    expect(logger.printHistory()).toMatch('Current directory is not a git directory')
    await fs.rm(nonGitDir, { recursive: true })
  })

  test('fails without output when not in a git directory and quiet', async () => {
    const nonGitDir = await createTempDir()
    const logger = makeConsoleMock()
    await expect(
      lintStaged({ ...prettierWrite, cwd: nonGitDir, quiet: true }, logger)
    ).resolves.toEqual(false)
    expect(logger.printHistory()).toBeFalsy()
    await fs.rm(nonGitDir, { recursive: true })
  })
})
