import { jest } from '@jest/globals'

import * as configFixtures from './__fixtures__/configs.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'handles binary files',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // mark file as binary
      await writeFile('.gitattributes', 'binary\n')

      // Stage pretty file
      await writeFile('binary', Buffer.from('Hello, World!', 'binary'))
      await execGit(['add', 'binary'])

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit()

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
    })
  )
})
