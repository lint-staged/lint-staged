import { describe, test } from 'vitest'

import * as configFixtures from '../integration/__fixtures__/configs.js'
import * as fileFixtures from '../integration/__fixtures__/files.js'
import { withGitIntegration } from '../integration/__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'works with git add + git commit',
    withGitIntegration(async ({ execGit, expect, setupPreCommitHook, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))
      await setupPreCommitHook()

      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', '.'])
      await execGit(['commit', '-m test'])
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)

      await writeFile('test.js', fileFixtures.uglyJSWithChanges)
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m test'])
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJSWithChanges)

      expect(await execGit(['status'])).toMatch('nothing to commit, working tree clean')
    })
  )

  test(
    'works with git commit --all',
    withGitIntegration(async ({ execGit, expect, setupPreCommitHook, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))
      await setupPreCommitHook()

      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', '.'])
      await execGit(['commit', '-m test'])
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)

      await writeFile('test.js', fileFixtures.uglyJSWithChanges)
      await execGit(['commit', '--all', '-m test'])
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJSWithChanges)

      expect(await execGit(['status'])).toMatch('nothing to commit, working tree clean')
    })
  )

  test(
    'works with git commit <pathspec>',
    withGitIntegration(async ({ execGit, expect, setupPreCommitHook, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))
      await setupPreCommitHook()

      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', '.'])
      await execGit(['commit', '-m test'])
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)

      await writeFile('test.js', fileFixtures.uglyJSWithChanges)
      await execGit(['commit', '-m test', '.'])
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJSWithChanges)

      expect(await execGit(['status'])).toMatch('nothing to commit, working tree clean')
    })
  )
})
