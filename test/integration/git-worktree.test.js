import path from 'node:path'

import { jest } from '@jest/globals'

import { prettierListDifferent } from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'handles git worktrees',
    withGitIntegration(async ({ appendFile, cwd, execGit, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(prettierListDifferent))

      // create a new branch and add it as worktree
      const workTreeDir = path.resolve(cwd, 'worktree')
      await execGit(['branch', 'test'])
      await execGit(['worktree', 'add', workTreeDir, 'test'])

      // Stage pretty file
      await appendFile('test.js', fileFixtures.prettyJS, workTreeDir)
      await execGit(['add', 'test.js'], { cwd: workTreeDir })

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit(undefined, workTreeDir)

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'], { cwd: workTreeDir })).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'], { cwd: workTreeDir })).toMatch('test')
      expect(await readFile('test.js', workTreeDir)).toEqual(fileFixtures.prettyJS)
    })
  )
})
