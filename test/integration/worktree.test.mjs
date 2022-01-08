import path from 'path'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import lintStaged from '../../lib/index.mjs'

import { addConfigFileSerializer } from './utils/configFilepathSerializer.mjs'
import { testWithGitIntegration } from './utils/gitIntegration.mjs'
import * as fileFixtures from './fixtures/files.mjs'

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
    'handles git worktrees',
    async ({ appendFile, cwd, execGit, readFile }) => {
      // create a new branch and add it as worktree
      const workTreeDir = path.resolve(cwd, 'worktree')
      await execGit(['branch', 'test'])
      await execGit(['worktree', 'add', workTreeDir, 'test'])

      // Stage pretty file
      await appendFile('test.js', fileFixtures.prettyJS, workTreeDir)
      await execGit(['add', 'test.js'], { cwd: workTreeDir })

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await lintStaged({ config: { '*.js': 'prettier --list-different' }, cwd: workTreeDir })
      await execGit(['commit', '-m test'], { cwd: workTreeDir })

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'], { cwd: workTreeDir })).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'], { cwd: workTreeDir })).toMatch('test')
      expect(await readFile('test.js', workTreeDir)).toEqual(fileFixtures.prettyJS)
    }
  )
})
