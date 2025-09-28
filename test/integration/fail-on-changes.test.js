import { describe, test } from 'vitest'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'should fail when tasks modify files and --fail-on-changes is used',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage ugly files
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with `prettier --write` so that it modifies files
      await expect(() =>
        gitCommit({
          lintStaged: {
            failOnChanges: true,
            quiet: true,
          },
        })
      ).rejects.toThrow('lint-staged failed because `--fail-on-changes` was used')

      // Changes weren't reverted because "--no-revert" is implied
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'should not fail when --fail-on-changes is used but tasks do not modify files',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage ugly files
      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with `prettier --write` so that it modifies files
      await gitCommit({
        lintStaged: {
          failOnChanges: true,
          quiet: true,
        },
      })

      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'should fail and revert when both --fail-on-changes and --revert are used',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage ugly files
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with `prettier --write` so that it modifies files
      await expect(() =>
        gitCommit({
          lintStaged: {
            failOnChanges: true,
            revert: true,
          },
        })
      ).rejects.toThrow('lint-staged failed because `--fail-on-changes` was used')

      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)
    })
  )
})
