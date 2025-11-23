import { describe, test } from 'vitest'

import * as fileFixtures from '../integration/__fixtures__/files.js'
import { withGitIntegration } from '../integration/__utils__/withGitIntegration.js'
import { getLintStagedExecutor } from './__utils__/getLintStagedExecutor.js'

describe('lint-staged', () => {
  test(
    'kills long-running tasks with SIGKILL on failure',
    withGitIntegration(async ({ execGit, expect, writeFile, cwd }) => {
      const lintStaged = getLintStagedExecutor(cwd)

      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify({
          '*.js': 'prettier --list-different',
          '*.{js,ts}': 'node -e "new Promise(resolve => setTimeout(resolve, 1000))"',
        })
      )

      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', '.lintstagedrc.json'])
      await execGit(['add', 'test.js'])

      await expect(lintStaged()).rejects.toEqual(
        expect.objectContaining({
          output: expect.stringContaining(
            'Task terminated: node -e "new Promise(resolve => setTimeout(resolve, 1000))"'
          ),
        })
      )
    })
  )
})
