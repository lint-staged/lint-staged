import makeConsoleMock from 'consolemock'

import { addConfigFileSerializer } from './utils/configFilepathSerializer'
import { testWithGitIntegration } from './utils/gitIntegration'
import * as fileFixtures from './fixtures/files'

jest.unmock('execa')
jest.setTimeout(20000)

jest.mock('../../lib/resolveConfig', () => ({
  /** Unfortunately necessary due to non-ESM tests. */
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))

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
    'works when amending previous commit with unstaged changes',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Edit file from previous commit
      await appendFile('README.md', '\n## Amended\n')
      await execGit(['add', 'README.md'])

      // Edit again, but keep it unstaged
      await appendFile('README.md', '\n## Edited\n')
      await appendFile('test-untracked.js', fileFixtures.prettyJS)

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit({ config: { '*.{js,md}': 'prettier --list-different' } }, [
        '--amend',
        '--no-edit',
      ])

      // Nothing is wrong, so the commit was amended
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await readFile('README.md')).toMatchInlineSnapshot(`
                        "# Test

                        ## Amended

                        ## Edited
                        "
                `)
      expect(await readFile('test-untracked.js')).toEqual(fileFixtures.prettyJS)
      const status = await execGit(['status'])
      expect(status).toMatch('modified:   README.md')
      expect(status).toMatch('test-untracked.js')
      expect(status).toMatch('no changes added to commit')
    }
  )
})
