import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import { addConfigFileSerializer } from './utils/configFilepathSerializer.mjs'
import { testWithGitIntegration } from './utils/gitIntegration.mjs'
import * as fileFixtures from './fixtures/files.mjs'
import * as configFixtures from './fixtures/configs.mjs'

jest.setTimeout(20000)

addConfigFileSerializer()

describe('integration', () => {
  const globalConsoleTemp = console

  beforeAll(() => {
    console = makeConsoleMock()
  })

  afterEach(async () => {
    console.clearHistory()
  })

  afterAll(() => {
    console = globalConsoleTemp
  })

  testWithGitIntegration(
    'handles binary files',
    async ({ appendFile, execGit, gitCommit, readFile, writeFile }) => {
      // mark file as binary
      await appendFile('.gitattributes', 'binary\n')

      // Stage pretty file
      await writeFile('binary', Buffer.from('Hello, World!', 'binary'))
      await execGit(['add', 'binary'])

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit(configFixtures.prettierListDifferent)

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
    }
  )

  testWithGitIntegration(
    'runs chunked tasks when necessary',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Stage two files
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])
      await appendFile('test2.js', fileFixtures.prettyJS)
      await execGit(['add', 'test2.js'])

      // Run lint-staged with `prettier --list-different` and commit pretty file
      // Set maxArgLength low enough so that chunking is used
      await gitCommit({ config: { '*.js': 'prettier --list-different' }, maxArgLength: 10 })

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('test2.js')).toEqual(fileFixtures.prettyJS)
    }
  )
})
