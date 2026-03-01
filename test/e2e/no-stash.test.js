import { describe, test } from 'vitest'

import * as configFixtures from '../integration/__fixtures__/configs.js'
import * as fileFixtures from '../integration/__fixtures__/files.js'
import { withGitIntegration } from '../integration/__utils__/withGitIntegration.js'
import { forkLintStagedBin } from './__utils__/forkLintStagedBin.js'

describe('lint-staged', () => {
  test(
    '--diff implies --no-stash',
    withGitIntegration(async ({ execGit, expect, writeFile, cwd }) => {
      await execGit(['checkout', '-b', 'my-branch'])
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))
      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', '.lintstagedrc.json'])
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m', 'test'])

      let res = await forkLintStagedBin(undefined, { cwd })
      expect(res).toMatch('could not find any staged files.')

      res = await forkLintStagedBin(['--stash'], { cwd })
      expect(res).toMatch('could not find any staged files.')

      res = await forkLintStagedBin(['--no-stash'], { cwd })
      expect(res).toMatch('could not find any staged files.')
      expect(res).toMatch(
        'Skipping backup because `--no-stash` was used. This might result in data loss.'
      )

      res = await forkLintStagedBin(['--diff=main...my-branch'], { cwd })
      expect(res).toMatch('Skipping backup because `--diff` was used.')

      await expect(
        forkLintStagedBin(['--diff=main...my-branch', '--stash'], { cwd })
      ).rejects.toThrow('lint-staged failed due to a git error.')

      res = await forkLintStagedBin(['--diff=main...my-branch', '--no-stash'], { cwd })
      expect(res).toMatch('Skipping backup because `--diff` was used.')
    })
  )

  test(
    "--no-stash doesn't imply --no-hide-partially-staged, losing conflicting unstaged changes",
    withGitIntegration(async ({ execGit, expect, readFile, writeFile, cwd }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage ugly file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', '.'])

      // modify file with unstaged changes
      await writeFile('test.js', fileFixtures.uglyJSWithChanges)

      // lint-staged fails because file is ugly
      await expect(forkLintStagedBin(['--no-stash'], { cwd })).rejects.toThrow(
        'Skipping backup because `--no-stash` was used. This might result in data loss.'
      )

      // unstaged changes were discarded
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)

      expect(await execGit(['status'])).toMatch('new file:   test.js')
    })
  )
})
