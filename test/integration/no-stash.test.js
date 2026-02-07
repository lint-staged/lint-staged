import fs from 'node:fs'
import path from 'node:path'

import { describe, test } from 'vitest'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'skips backup and revert with --no-stash',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage pretty file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with --no-stash
      const stdout = await gitCommit({ lintStaged: { stash: false } })

      expect(stdout).toMatch(
        'Skipping backup because `--no-stash` was used. This might result in data loss.'
      )

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'aborts commit without reverting with --no-stash, when merge conflict',
    withGitIntegration(async ({ cwd, execGit, expect, gitCommit, readFile, writeFile }) => {
      // Stage file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with action that does horrible things to the file, causing a merge conflict
      await expect(
        gitCommit({
          lintStaged: {
            stash: false,
            hidePartiallyStaged: true,
            config: {
              '*.js': async () => {
                const testFile = path.join(cwd, 'test.js')
                fs.writeFileSync(testFile, Buffer.from(fileFixtures.invalidJS, 'binary'))
                return `prettier --write ${testFile}`
              },
            },
          },
        })
      ).rejects.toThrow('Unstaged changes could not be restored due to a merge conflict!')

      // Something was wrong so the commit was aborted
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status', '--porcelain'])).toMatchInlineSnapshot(`"UU test.js"`)

      // Without revert, the merge conflict is left in-place
      expect(await readFile('test.js')).toMatchInlineSnapshot(`
        "<<<<<<< ours
        module.exports = {
          foo: "bar",
        };
        =======
        const obj = {
            'foo': 'bar'
        >>>>>>> theirs
        "
      `)
    })
  )

  test(
    'aborts commit without reverting with --no-stash, when  invalid syntax in file',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      await writeFile('test2.js', fileFixtures.invalidJS)
      await execGit(['add', 'test2.js'])

      // Run lint-staged with --no-stash
      await expect(gitCommit({ lintStaged: { stash: false } })).rejects.toThrow(
        'prettier --write [FAILED]'
      )

      // Something was wrong, so the commit was aborted
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS) // file was still fixed
      expect(await readFile('test2.js')).toEqual(fileFixtures.invalidJS)
    })
  )

  test(
    'hides and restores unstaged changes to partially staged files by default even with --no-stash',
    withGitIntegration(async ({ appendFile, execGit, expect, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', '.'])

      // Edit ugly file but do not stage changes
      const appended = '\n\nconsole.log("test");\n'
      await appendFile('test.js', appended)

      await gitCommit({
        lintStaged: { stash: false },
      })

      // File is pretty, and has been edited with unstaged changes
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS + appended)
      expect(await execGit(['status'])).toMatch('modified:   test.js')
    })
  )

  test(
    'loses conflicting unstaged changes when linter fixes staged file when using --no-stash',
    withGitIntegration(async ({ writeFile, execGit, expect, gitCommit, readFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage ugly file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', '.'])

      // modify file with unstaged changes
      await writeFile('test.js', fileFixtures.uglyJSWithChanges)

      let error
      try {
        await gitCommit({
          lintStaged: { stash: false },
        })
      } catch (err) {
        error = err.message
      }

      expect(error).toMatch(
        'Skipping backup because `--no-stash` was used. This might result in data loss.'
      )
      expect(error).toMatch('Unstaged changes could not be restored due to a merge conflict')
      expect(error).toMatch('Unstaged changes have been kept back in a patch file:')
      expect(error).toMatch('lint-staged_unstaged.patch')

      expect(await readFile('.git/lint-staged_unstaged.patch')).toMatch(`
-    'foo': 'bar'
+    'foo': 'bar',
+    'bar': 'baz'
`)

      // File was left in merge conflict state
      expect(await execGit(['status'])).toMatch('both modified:   test.js')
      expect(await readFile('test.js')).toMatch('<<<<<<< ours')
      expect(await readFile('test.js')).toMatch('>>>>>>> theirs')
    })
  )
})
