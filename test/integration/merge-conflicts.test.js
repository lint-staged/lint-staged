import path from 'path'

import makeConsoleMock from 'consolemock'
import fs from 'fs-extra'

import lintStaged from '../../lib/index'

import { testWithGitIntegration } from './utils/gitIntegration'
import { addConfigFileSerializer } from './utils/configFilepathSerializer'
import * as fileFixtures from './fixtures/files'
import * as configFixtures from './fixtures/configs'

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
    'handles merge conflicts',
    async ({ appendFile, cwd, execGit, gitCommit, readFile, writeFile }) => {
      const fileInBranchA = `module.exports = "foo";\n`
      const fileInBranchB = `module.exports = 'bar'\n`
      const fileInBranchBFixed = `module.exports = "bar";\n`

      // Create one branch
      await execGit(['checkout', '-b', 'branch-a'])
      await appendFile('test.js', fileInBranchA)
      await execGit(['add', '.'])
      await gitCommit(configFixtures.prettierWrite, ['-m commit a'])
      expect(await readFile('test.js')).toEqual(fileInBranchA)

      await execGit(['checkout', 'master'])

      // Create another branch
      await execGit(['checkout', '-b', 'branch-b'])
      await appendFile('test.js', fileInBranchB)
      await execGit(['add', '.'])
      await gitCommit(configFixtures.prettierWrite, ['-m commit b'])
      expect(await readFile('test.js')).toEqual(fileInBranchBFixed)

      // Merge first branch
      await execGit(['checkout', 'master'])
      await execGit(['merge', 'branch-a'])
      expect(await readFile('test.js')).toEqual(fileInBranchA)
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('commit a')

      // Merge second branch, causing merge conflict
      try {
        await execGit(['merge', 'branch-b'])
      } catch (error) {
        expect(error.message).toMatch('Merge conflict in test.js')
      }

      expect(await readFile('test.js')).toMatchInlineSnapshot(`
      "<<<<<<< HEAD
      module.exports = \\"foo\\";
      =======
      module.exports = \\"bar\\";
      >>>>>>> branch-b
      "
    `)

      // Fix conflict and commit using lint-staged
      await writeFile('test.js', fileInBranchB)
      expect(await readFile('test.js')).toEqual(fileInBranchB)
      await execGit(['add', '.'])

      // Do not use `gitCommit` wrapper here
      await lintStaged({ ...configFixtures.prettierWrite, cwd, quiet: true })
      await execGit(['commit', '--no-edit'])

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('4')
      const log = await execGit(['log', '-1', '--pretty=%B'])
      expect(log).toMatch(`Merge branch 'branch-b`)
      expect(log).toMatch(`Conflicts:`)
      expect(log).toMatch(`test.js`)
      expect(await readFile('test.js')).toEqual(fileInBranchBFixed)
    }
  )

  testWithGitIntegration(
    'handles merge conflict when task errors',
    async ({ appendFile, cwd, execGit, gitCommit, readFile, writeFile }) => {
      const fileInBranchA = `module.exports = "foo";\n`
      const fileInBranchB = `module.exports = 'bar'\n`
      const fileInBranchBFixed = `module.exports = "bar";\n`

      // Create one branch
      await execGit(['checkout', '-b', 'branch-a'])
      await appendFile('test.js', fileInBranchA)
      await execGit(['add', '.'])
      await gitCommit(configFixtures.prettierWrite, ['-m commit a'])
      expect(await readFile('test.js')).toEqual(fileInBranchA)

      await execGit(['checkout', 'master'])

      // Create another branch
      await execGit(['checkout', '-b', 'branch-b'])
      await appendFile('test.js', fileInBranchB)
      await execGit(['add', '.'])
      await gitCommit(configFixtures.prettierWrite, ['-m commit b'])
      expect(await readFile('test.js')).toEqual(fileInBranchBFixed)

      // Merge first branch
      await execGit(['checkout', 'master'])
      await execGit(['merge', 'branch-a'])
      expect(await readFile('test.js')).toEqual(fileInBranchA)
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('commit a')

      // Merge second branch, causing merge conflict
      await expect(execGit(['merge', 'branch-b'])).rejects.toThrowError('Merge conflict in test.js')

      expect(await readFile('test.js')).toMatchInlineSnapshot(`
      "<<<<<<< HEAD
      module.exports = \\"foo\\";
      =======
      module.exports = \\"bar\\";
      >>>>>>> branch-b
      "
    `)

      // Fix conflict and commit using lint-staged
      await writeFile('test.js', fileInBranchB)
      expect(await readFile('test.js')).toEqual(fileInBranchB)
      await execGit(['add', '.'])

      // Do not use `gitCommit` wrapper here
      await expect(
        lintStaged({ config: { '*.js': 'prettier --list-different' }, cwd, quiet: true })
      ).resolves.toEqual(false) // Did not pass so returns `false`

      // Something went wrong, so lintStaged failed and merge is still going
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['status'])).toMatch('All conflicts fixed but you are still merging')
      expect(await readFile('test.js')).toEqual(fileInBranchB)
    }
  )

  testWithGitIntegration(
    'fails to commit entire staged file when there are unrecoverable merge conflicts',
    async ({ appendFile, cwd, execGit, gitCommit }) => {
      // Stage file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with action that does horrible things to the file, causing a merge conflict
      const testFile = path.join(cwd, 'test.js')
      await expect(
        gitCommit({
          config: {
            '*.js': () => {
              fs.writeFileSync(testFile, Buffer.from(fileFixtures.invalidJS, 'binary'))
              return `prettier --write ${testFile}`
            },
          },
        })
      ).rejects.toThrowError()

      expect(console.printHistory()).toMatch(
        'Unstaged changes could not be restored due to a merge conflict!'
      )

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      // Git status is a bit messed up because the horrible things we did
      // in the config above were done before creating the initial backup stash,
      // and thus included in it.
      expect(await execGit(['status', '--porcelain'])).toMatchInlineSnapshot(`"AM test.js"`)
    }
  )
})
