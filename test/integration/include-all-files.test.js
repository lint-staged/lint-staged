import { describe, test } from 'vitest'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'lints all files when --all is used',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      // Commit ugly file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m', 'commit'])

      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.oxfmtListDifferent))

      // Run lint-staged with --all
      const stdout = await gitCommit({ lintStaged: { all: true } })

      expect(stdout).toMatch(
        'Skipping backup because `--all` was used. This might result in data loss.'
      )

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )
})
