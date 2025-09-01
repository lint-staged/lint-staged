import { jest } from '@jest/globals'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'should fail when tasks modify files and --exit-code is used',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage ugly files
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with `prettier --write` so that it modifies files
      await expect(() =>
        gitCommit({
          lintStaged: {
            exitCode: true,
            quiet: true,
          },
        })
      ).rejects.toThrow('lint-staged failed because `--exit-code` was used')

      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)
    })
  )

  test(
    'should not fail --exit-code is used but tasks do not modify files',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage ugly files
      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with `prettier --write` so that it modifies files
      await gitCommit({
        lintStaged: {
          exitCode: true,
          quiet: true,
        },
      })

      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'should fail and leave task modifications in worktree when --exit-code and --no-revert are used',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage ugly files
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with `prettier --write` so that it modifies files
      await expect(() =>
        gitCommit({
          lintStaged: {
            exitCode: true,
            revert: false, // --no-revert
            quiet: true,
          },
        })
      ).rejects.toThrow('lint-staged failed because `--exit-code` was used')

      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )
})
