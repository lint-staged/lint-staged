import { jest } from '@jest/globals'

import { prettierListDifferent } from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'ignores untracked files',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile, writeFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(prettierListDifferent))

      // Stage pretty file
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Add untracked files
      await appendFile('test-untracked.js', fileFixtures.prettyJS)
      await appendFile('.gitattributes', 'binary\n')
      await writeFile('binary', Buffer.from('Hello, World!', 'binary'))

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit()

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('test-untracked.js')).toEqual(fileFixtures.prettyJS)
      expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
    })
  )

  test(
    'ingores untracked files when task fails',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile, writeFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(prettierListDifferent))

      // Stage unfixable file
      await appendFile('test.js', fileFixtures.invalidJS)
      await execGit(['add', 'test.js'])

      // Add untracked files
      await appendFile('test-untracked.js', fileFixtures.prettyJS)
      await appendFile('.gitattributes', 'binary\n')
      await writeFile('binary', Buffer.from('Hello, World!', 'binary'))

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await expect(gitCommit()).rejects.toThrow()

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await readFile('test.js')).toEqual(fileFixtures.invalidJS)
      expect(await readFile('test-untracked.js')).toEqual(fileFixtures.prettyJS)
      expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
    })
  )
})
