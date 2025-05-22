import fs from 'node:fs/promises'
import path from 'node:path'

import { jest } from '@jest/globals'

import { prettierListDifferent } from './__fixtures__/configs.js'
import { prettyJS } from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'supports symlinked git dir',
    withGitIntegration(async ({ cwd, execGit, gitCommit, readFile, writeFile }) => {
      // Rename `.git` to `git` and add symbolic link pointing to it
      await fs.rename(path.resolve(cwd, '.git'), path.resolve(cwd, 'git'))
      await fs.symlink(path.resolve(cwd, 'git'), path.resolve(cwd, '.git'), 'dir')

      await writeFile('.lintstagedrc.json', JSON.stringify(prettierListDifferent))

      // Stage pretty file
      await writeFile('test file.js', prettyJS)
      await execGit(['add', 'test file.js'])

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit()

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test file.js')).toEqual(prettyJS)
    })
  )
})
