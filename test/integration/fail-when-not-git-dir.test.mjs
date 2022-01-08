import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'
import fs from 'fs-extra'

import lintStaged from '../../lib/index.mjs'

import { createTempDir } from './utils/tempDir.mjs'
import { prettierWrite } from './fixtures/configs.mjs'

jest.setTimeout(20000)

describe('integration', () => {
  test('fails when not in a git directory', async () => {
    const nonGitDir = await createTempDir()
    const logger = makeConsoleMock()
    await expect(lintStaged({ ...prettierWrite, cwd: nonGitDir }, logger)).resolves.toEqual(false)
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR ✖ Current directory is not a git directory!"
    `)
    await fs.remove(nonGitDir)
  })

  test('fails without output when not in a git directory and quiet', async () => {
    const nonGitDir = await createTempDir()
    const logger = makeConsoleMock()
    await expect(
      lintStaged({ ...prettierWrite, cwd: nonGitDir, quiet: true }, logger)
    ).resolves.toEqual(false)
    expect(logger.printHistory()).toMatchInlineSnapshot(`""`)
    await fs.remove(nonGitDir)
  })
})
