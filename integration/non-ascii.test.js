import { jest } from '@jest/globals'

import { withGitIntegration } from './utils/gitIntegration.js'
import * as fileFixtures from './fixtures/files.js'
import * as configFixtures from './fixtures/configs.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('integration', () => {
  const getQuotePathTest = (state) =>
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      // Run lint-staged with `prettier --write` and commit pretty files
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      await execGit(['config', 'core.quotepath', state])

      // Stage multiple ugly files
      await writeFile('привет.js', fileFixtures.uglyJS)
      await execGit(['add', 'привет.js'])

      await writeFile('你好.js', fileFixtures.uglyJS)
      await execGit(['add', '你好.js'])

      await writeFile('👋.js', fileFixtures.uglyJS)
      await execGit(['add', '👋.js'])

      await gitCommit()

      // Nothing is wrong, so a new commit is created and files are pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('привет.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('你好.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('👋.js')).toEqual(fileFixtures.prettyJS)
    })

  test('handles files with non-ascii characters when core.quotepath is on', getQuotePathTest('on'))

  test(
    'handles files with non-ascii characters when core.quotepath is off',
    getQuotePathTest('off')
  )
})
