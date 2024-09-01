import fs from 'node:fs'
import path from 'node:path'

import { jest } from '@jest/globals'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'skips backup and revert with --no-stash',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage pretty file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with --no-stash
      const stdout = await gitCommit({ lintStaged: { stash: false } })

      expect(stdout).toMatch('Skipping backup because `--no-stash` was used')
      expect(stdout).toMatch(
        'Skipping hiding unstaged changes from partially staged files because `--no-stash` was used'
      )

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'aborts commit without reverting with --no-stash, when merge conflict',
    withGitIntegration(async ({ cwd, execGit, gitCommit, readFile, writeFile }) => {
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
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      await writeFile('test2.js', fileFixtures.invalidJS)
      await execGit(['add', 'test2.js'])

      // Run lint-staged with --no-stash
      await expect(gitCommit({ lintStaged: { stash: false } })).rejects.toThrow(
        'SyntaxError: Unexpected token'
      )

      // Something was wrong, so the commit was aborted
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS) // file was still fixed
      expect(await readFile('test2.js')).toEqual(fileFixtures.invalidJS)
    })
  )
})
