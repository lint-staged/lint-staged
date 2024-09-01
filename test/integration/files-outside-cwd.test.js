import path from 'node:path'

import { jest } from '@jest/globals'

import { prettierWrite } from './__fixtures__/configs.js'
import { prettyJS, uglyJS } from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'does not care about staged file outside current cwd with another staged file',
    withGitIntegration(async ({ cwd, execGit, gitCommit, readFile, writeFile }) => {
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
    withGitIntegration(async ({ cwd, execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('file.js', uglyJS)
      await writeFile('deeper/.lintstagedrc.json', JSON.stringify(prettierWrite))
      await execGit(['add', '.'])

      // Run lint-staged in "deeper/""
      await expect(gitCommit({ cwd: path.join(cwd, 'deeper') })).resolves.toMatch(
        `No staged files match any configured task`
      )

      // File outside deeper/ was not fixed
      expect(await readFile('file.js')).toEqual(uglyJS)
    })
  )
})
