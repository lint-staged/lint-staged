import { describe, test } from 'vitest'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'stages and commits files modified by tasks even when they were not originally staged',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      // Commit ugly files before adding lint-staged config
      await writeFile('test.js', fileFixtures.uglyJS)
      await writeFile('test2.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js', 'test2.js'])
      await execGit(['commit', '-m', 'commit ugly files'])

      // Stage only the config, whose function task formats all files
      await writeFile('lint-staged.config.mjs', 'export default () => "oxfmt --write ."')
      await execGit(['add', 'lint-staged.config.mjs'])
      expect(await execGit(['diff', '--cached', '--name-only'])).toEqual('lint-staged.config.mjs')

      await gitCommit()

      // Task modifications to the previously committed files are included in the new commit
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('3')
      expect(await execGit(['show', 'HEAD:test.js'])).toEqual(fileFixtures.prettyJS.trim())
      expect(await execGit(['show', 'HEAD:test2.js'])).toEqual(fileFixtures.prettyJS.trim())
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('test2.js')).toEqual(fileFixtures.prettyJS)
      expect(await execGit(['status', '--porcelain'])).toEqual('')
    })
  )

  test(
    'keeps unrelated changes unstaged when their patch is no longer last in the diff',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.oxfmtWrite))
      await writeFile('a.js', fileFixtures.prettyJS)
      await writeFile('z.js', fileFixtures.prettyJS)
      await execGit(['add', '.'])
      await execGit(['commit', '-m', 'commit pretty files'])

      // Leave changes to a.js unstaged and stage only the ugly changes to z.js
      await writeFile('a.js', fileFixtures.prettyJSWithChanges)
      await writeFile('z.js', fileFixtures.uglyJSWithChanges)
      await execGit(['add', 'z.js'])
      expect(await execGit(['diff', '--name-only'])).toEqual('a.js')
      expect(await execGit(['diff', '--cached', '--name-only'])).toEqual('z.js')

      // Formatting z.js adds a patch after a.js, whose trailing newline must not
      // cause its unchanged patch to be treated as a task modification
      await gitCommit()

      expect(await execGit(['show', 'HEAD:z.js'])).toEqual(fileFixtures.prettyJSWithChanges.trim())
      expect(await execGit(['show', 'HEAD:a.js'])).toEqual(fileFixtures.prettyJS.trim())
      expect(await readFile('z.js')).toEqual(fileFixtures.prettyJSWithChanges)
      expect(await readFile('a.js')).toEqual(fileFixtures.prettyJSWithChanges)
      expect(await execGit(['status', '--porcelain'])).toEqual(' M a.js')
    })
  )
})
