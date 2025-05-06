import { jest } from '@jest/globals'

import { prettyJS, uglyJS } from './__fixtures__/files.js'
import { isWindows } from './__utils__/isWindows.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'fails when linter creates a .git/index.lock',
    withGitIntegration(async ({ appendFile, cwd, execGit, gitCommit, readFile, removeFile }) => {
      // Stage ugly file
      await appendFile('test.js', uglyJS)
      await execGit(['add', 'test.js'])

      // Edit ugly file but do not stage changes
      const appended = '\n\nconsole.log("test");\n'
      await appendFile('test.js', appended)
      expect(await readFile('test.js')).toEqual(uglyJS + appended)
      const diff = await execGit(['diff'])

      // Run lint-staged with `prettier --write` and commit pretty file
      // The task creates a git lock file and runs `git add` to simulate failure
      await expect(
        gitCommit({
          lintStaged: {
            shell: isWindows,
            config: {
              '*.js': (files) => [
                `${isWindows ? 'type nul >' : 'touch'} ${cwd}/.git/index.lock`,
                `prettier --write ${files.join(' ')}`,
                `git add ${files.join(' ')}`,
              ],
            },
          },
        })
      ).rejects.toThrow(".git/index.lock': File exists")

      // Something was wrong so new commit wasn't created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')

      // But local modifications are gone
      expect(await execGit(['diff'])).not.toEqual(diff)
      expect(await execGit(['diff'])).toMatchInlineSnapshot(`
        "diff --git a/test.js b/test.js
        index 1eff6a0..8baadc8 100644
        --- a/test.js
        +++ b/test.js
        @@ -1,3 +1,3 @@
         module.exports = {
        -    'foo': 'bar'
        -}
        +  foo: "bar",
        +};"
      `)

      expect(await readFile('test.js')).not.toEqual(uglyJS + appended)
      expect(await readFile('test.js')).toEqual(prettyJS)

      // Remove lock file
      await removeFile(`.git/index.lock`)

      // Luckily there is a stash
      expect(await execGit(['stash', 'list'])).toMatch('stash@{0}: lint-staged automatic backup')
      await execGit(['reset', '--hard'])
      await execGit(['stash', 'pop', '--index'])

      expect(await execGit(['diff'])).toEqual(diff)
      expect(await readFile('test.js')).toEqual(uglyJS + appended)
    })
  )
})
