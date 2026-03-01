import { describe, test } from 'vitest'

import * as fileFixtures from '../integration/__fixtures__/files.js'
import { withGitIntegration } from '../integration/__utils__/withGitIntegration.js'
import { forkLintStagedBin } from './__utils__/forkLintStagedBin.js'

describe('lint-staged', () => {
  test(
    'kills long-running tasks with SIGKILL on failure',
    withGitIntegration(async ({ execGit, expect, writeFile, cwd }) => {
      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify({
          '*.js': 'prettier --list-different',
          '*.{js,ts}': 'node -e "new Promise(resolve => setTimeout(resolve, 100_000))"',
        })
      )

      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', '.lintstagedrc.json'])
      await execGit(['add', 'test.js'])

      await expect(forkLintStagedBin(undefined, { cwd })).rejects.toThrow(
        'Task killed: node -e "new Promise(resolve => setTimeout(resolve, 100_000))"'
      )
    })
  )
})
