import { describe, test } from 'vitest'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'skips hiding unstaged changes from partially staged files with --no-hide-partially-staged',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage ugly file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // modify file with unstaged changes
      await writeFile('test.js', fileFixtures.uglyJSWithChanges)

      // Run lint-staged with --no-hide-partially-staged
      const stdout = await gitCommit({ lintStaged: { hidePartiallyStaged: false } })

      expect(stdout).toMatch(
        'Skipping hiding unstaged changes from partially staged files because `--no-hide-partially-staged` was used'
      )

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJSWithChanges)
    })
  )
})
