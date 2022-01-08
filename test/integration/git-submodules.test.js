import path from 'path'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'
import fs from 'fs-extra'

import lintStaged from '../../lib/index.js'

import { addConfigFileSerializer } from './utils/configFilepathSerializer.js'
import { testWithGitIntegration } from './utils/gitIntegration.js'
import * as fileFixtures from './fixtures/files.js'

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
    'handles git submodules',
    async ({ appendFile, cwd, execGit, readFile }) => {
      // create a new repo for the git submodule to a temp path
      let submoduleDir = path.resolve(cwd, 'submodule-temp')
      await fs.ensureDir(submoduleDir)
      await execGit('init', { cwd: submoduleDir })
      await execGit(['config', 'user.name', '"test"'], { cwd: submoduleDir })
      await execGit(['config', 'user.email', '"test@test.com"'], { cwd: submoduleDir })
      await appendFile('README.md', '# Test\n', submoduleDir)
      await execGit(['add', 'README.md'], { cwd: submoduleDir })
      await execGit(['commit', '-m initial commit'], { cwd: submoduleDir })

      // Add the newly-created repo as a submodule in a new path.
      // This simulates adding it from a remote
      await execGit(['submodule', 'add', '--force', './submodule-temp', './submodule'])
      submoduleDir = path.resolve(cwd, 'submodule')
      // Set these again for Windows git in CI
      await execGit(['config', 'user.name', '"test"'], { cwd: submoduleDir })
      await execGit(['config', 'user.email', '"test@test.com"'], { cwd: submoduleDir })

      // Stage pretty file
      await appendFile('test.js', fileFixtures.prettyJS, submoduleDir)
      await execGit(['add', 'test.js'], { cwd: submoduleDir })

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await lintStaged({ config: { '*.js': 'prettier --list-different' }, cwd: submoduleDir })
      await execGit(['commit', '-m test'], { cwd: submoduleDir })

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'], { cwd: submoduleDir })).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'], { cwd: submoduleDir })).toMatch('test')
      expect(await readFile('test.js', submoduleDir)).toEqual(fileFixtures.prettyJS)
    }
  )
})
