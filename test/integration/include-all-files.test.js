import { describe, test } from 'vitest'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'lints all files when --all is used',
    withGitIntegration(async ({ execGit, expect, gitCommit, writeFile }) => {
      // Commit ugly file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m', 'commit'])

      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.oxfmtListDifferent))

      try {
        // Run lint-staged with --all
        await gitCommit({ lintStaged: { all: true } })
        expect.fail('Should throw')
      } catch (error) {
        expect(error.message).toMatch(
          'Skipping backup because `--all` was used. This might result in data loss.'
        )

        expect(error.message).toMatch('oxfmt --list-different')
      }
    })
  )
})
