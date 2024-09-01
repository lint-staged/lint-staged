import { jest } from '@jest/globals'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
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

      /**
       * @todo broken on Windows Node.js 20.4.0
       * @see https://github.com/nodejs/node/issues/48673
       */
      // await writeFile('👋.js', fileFixtures.uglyJS)
      // await execGit(['add', '👋.js'])

      await gitCommit()

      // Nothing is wrong, so a new commit is created and files are pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('привет.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('你好.js')).toEqual(fileFixtures.prettyJS)

      /**
       * @todo broken on Windows Node.js 20.4.0
       * @see https://github.com/nodejs/node/issues/48673
       */
      // expect(await readFile('👋.js')).toEqual(fileFixtures.prettyJS)
    })

  // eslint-disable-next-line jest/expect-expect
  test('handles files with non-ascii characters when core.quotepath is on', getQuotePathTest('on'))

  // eslint-disable-next-line jest/expect-expect
  test(
    'handles files with non-ascii characters when core.quotepath is off',
    getQuotePathTest('off')
  )
})
