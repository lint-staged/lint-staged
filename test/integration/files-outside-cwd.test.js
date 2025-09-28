import path from 'node:path'

import { describe, test } from 'vitest'

import { prettierWrite } from './__fixtures__/configs.js'
import { prettyJS, uglyJS } from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'does not care about staged file outside current cwd with another staged file',
    withGitIntegration(async ({ cwd, execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('file.js', uglyJS)
      await writeFile('deeper/file.js', uglyJS)
      await writeFile('deeper/.lintstagedrc.json', JSON.stringify(prettierWrite))
      await execGit(['add', '.'])

      // Run lint-staged in "deeper/""
      await gitCommit({ cwd: path.join(cwd, 'deeper') })

      // File inside deeper/ was fixed
      expect(await readFile('deeper/file.js')).toEqual(prettyJS)
      // ...but file outside was not
      expect(await readFile('file.js')).toEqual(uglyJS)
    })
  )

  test(
    'not care about staged file outside current cwd without any other staged files',
    withGitIntegration(async ({ cwd, execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('file.js', uglyJS)
      await writeFile('deeper/.lintstagedrc.json', JSON.stringify(prettierWrite))
      await execGit(['add', '.'])

      // Run lint-staged in "deeper/""
      await expect(gitCommit({ cwd: path.join(cwd, 'deeper') })).resolves.toMatch(
        `could not find any staged files matching configured tasks`
      )

      // File outside deeper/ was not fixed
      expect(await readFile('file.js')).toEqual(uglyJS)
    })
  )
})
