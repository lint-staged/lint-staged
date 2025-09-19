import { describe, test } from 'vitest'

import * as configFixtures from '../integration/__fixtures__/configs.js'
import * as fileFixtures from '../integration/__fixtures__/files.js'
import { withGitIntegration } from '../integration/__utils__/withGitIntegration.js'
import { getLintStagedExecutor } from './__utils__/getLintStagedExecutor.js'

describe('lint-staged', () => {
  test(
    '--diff implies --no-stash',
    withGitIntegration(async ({ execGit, expect, writeFile, cwd }) => {
      const lintStaged = getLintStagedExecutor(cwd)

      await execGit(['checkout', '-b', 'my-branch'])
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))
      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', '.lintstagedrc.json'])
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m', 'test'])

      let res = await lintStaged()
      expect(res.stdout).toMatch('No staged files found.')

      res = await lintStaged(['--stash'])
      expect(res.stdout).toMatch('No staged files found.')

      res = await lintStaged(['--no-stash'])
      expect(res.stdout).toMatch('No staged files found.')
      expect(res.stderr).toMatch(
        'Skipping backup because `--no-stash` was used. This might result in data loss.'
      )

      res = await lintStaged(['--diff=main...my-branch'])
      expect(res.stderr).toMatch('Skipping backup because `--diff` was used.')

      await expect(lintStaged(['--diff=main...my-branch', '--stash'])).rejects.toThrow(
        expect.objectContaining({
          stderr: expect.stringContaining('lint-staged failed due to a git error.'),
        })
      )

      res = await lintStaged(['--diff=main...my-branch', '--no-stash'])
      expect(res.stderr).toMatch('Skipping backup because `--diff` was used.')
    })
  )

  test(
    "--no-stash doesn't imply --no-hide-partially-staged, losing conflicting unstaged changes",
    withGitIntegration(async ({ execGit, expect, readFile, writeFile, cwd }) => {
      const lintStaged = getLintStagedExecutor(cwd)

      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage ugly file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', '.'])

      // modify file with unstaged changes
      await writeFile('test.js', fileFixtures.uglyJSWithChanges)

      // lint-staged fails because file is ugly
      await expect(lintStaged(['--no-stash'])).rejects.toMatchObject({
        stderr: expect.stringContaining(
          'Skipping backup because `--no-stash` was used. This might result in data loss.'
        ),
      })

      // unstaged changes were discarded
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)

      expect(await execGit(['status'])).toMatch('new file:   test.js')
    })
  )
})
