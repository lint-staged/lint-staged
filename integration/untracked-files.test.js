import { jest } from '@jest/globals'

import { withGitIntegration } from './utils/gitIntegration.js'
import * as fileFixtures from './fixtures/files.js'
import { prettierListDifferent } from './fixtures/configs.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('integration', () => {
  test(
    'keeps untracked files',
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
    'keeps untracked files when taks fails',
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
      await expect(gitCommit()).rejects.toThrowError()

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await readFile('test.js')).toEqual(fileFixtures.invalidJS)
      expect(await readFile('test-untracked.js')).toEqual(fileFixtures.prettyJS)
      expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
    })
  )
})
