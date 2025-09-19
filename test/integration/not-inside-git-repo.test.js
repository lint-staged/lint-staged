import fs from 'node:fs/promises'

import makeConsoleMock from 'consolemock'
import { describe, test } from 'vitest'

import lintStaged from '../../lib/index.js'
import { createTempDir } from '../__utils__/createTempDir.js'
import { prettierWrite } from './__fixtures__/configs.js'

describe('lint-staged', () => {
  test('fails when not in a git directory', async ({ expect }) => {
    const nonGitDir = await createTempDir()
    const logger = makeConsoleMock()
    await expect(lintStaged({ ...prettierWrite, cwd: nonGitDir }, logger)).resolves.toEqual(false)
    expect(logger.printHistory()).toMatch('Current directory is not a git directory')
    await fs.rm(nonGitDir, { recursive: true })
  })

  test('fails without output when not in a git directory and quiet', async ({ expect }) => {
    const nonGitDir = await createTempDir()
    const logger = makeConsoleMock()
    await expect(
      lintStaged({ ...prettierWrite, cwd: nonGitDir, quiet: true }, logger)
    ).resolves.toEqual(false)
    expect(logger.printHistory()).toBeFalsy()
    await fs.rm(nonGitDir, { recursive: true })
  })
})
