import '../integration/__mocks__/resolveConfig.js'

import { jest } from '@jest/globals'

import { withGitIntegration } from '../integration/__utils__/withGitIntegration.js'
import * as fileFixtures from '../integration/__fixtures__/files.js'
import * as configFixtures from '../integration/__fixtures__/configs.js'

import { getLintStagedExecutor } from './__utils__/getLintStagedExecutor.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    '--diff implies --no-stash',
    withGitIntegration(async ({ execGit, writeFile, cwd }) => {
      const lintStaged = getLintStagedExecutor(cwd)

      await execGit(['checkout', '-b', 'my-branch'])
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))
      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', '.lintstagedrc.json'])
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m', 'test'])

      let res = await lintStaged()
      expect(res.stdout).toMatch('No staged files found.')

      res = await lintStaged('--stash')
      expect(res.stdout).toMatch('No staged files found.')

      res = await lintStaged('--no-stash')
      expect(res.stdout).toMatch('No staged files found.')
      expect(res.stderr).toMatch('Skipping backup because `--no-stash` was used.')

      res = await lintStaged('--diff=master...my-branch')
      expect(res.stderr).toMatch('Skipping backup because `--diff` was used.')

      try {
        await lintStaged('--diff=master...my-branch --stash')
      } catch (err) {
        expect(err.stderr).toMatch('lint-staged failed due to a git error.')
      }

      res = await lintStaged('--diff=master...my-branch --no-stash')
      expect(res.stderr).toMatch('Skipping backup because `--diff` was used.')
    })
  )
})
