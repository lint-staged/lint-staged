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
    'keeps untracked files',
    async ({ appendFile, execGit, gitCommit, readFile, writeFile }) => {
      // Stage pretty file
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Add untracked files
      await appendFile('test-untracked.js', fileFixtures.prettyJS)
      await appendFile('.gitattributes', 'binary\n')
      await writeFile('binary', Buffer.from('Hello, World!', 'binary'))

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit(configFixtures.prettierListDifferent)

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('test-untracked.js')).toEqual(fileFixtures.prettyJS)
      expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
    }
  )

  testWithGitIntegration(
    'keeps untracked files when taks fails',
    async ({ appendFile, execGit, gitCommit, readFile, writeFile }) => {
      // Stage unfixable file
      await appendFile('test.js', fileFixtures.invalidJS)
      await execGit(['add', 'test.js'])

      // Add untracked files
      await appendFile('test-untracked.js', fileFixtures.prettyJS)
      await appendFile('.gitattributes', 'binary\n')
      await writeFile('binary', Buffer.from('Hello, World!', 'binary'))

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await expect(gitCommit(configFixtures.prettierListDifferent)).rejects.toThrowError()

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await readFile('test.js')).toEqual(fileFixtures.invalidJS)
      expect(await readFile('test-untracked.js')).toEqual(fileFixtures.prettyJS)
      expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
    }
  )
})
