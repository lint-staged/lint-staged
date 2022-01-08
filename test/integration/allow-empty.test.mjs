import path from 'path'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'
import fs from 'fs-extra'

import { addConfigFileSerializer } from './utils/configFilepathSerializer.mjs'
import { testWithGitIntegration } from './utils/gitIntegration.mjs'
import * as fileFixtures from './fixtures/files.mjs'
import * as configFixtures from './fixtures/configs.mjs'

addConfigFileSerializer()

jest.setTimeout(20000)

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
    'fails when task reverts staged changes without `--allow-empty`, to prevent an empty git commit',
    async ({ appendFile, cwd, execGit, gitCommit, readFile }) => {
      // Create and commit a pretty file without running lint-staged
      // This way the file will be available for the next step
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m committed pretty file'])

      // Edit file to be ugly
      await fs.remove(path.resolve(cwd, 'test.js'))
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with prettier --write to automatically fix the file
      // Since prettier reverts all changes, the commit should fail
      // use the old syntax with manual `git add` to provide a warning message
      await expect(
        gitCommit({ config: { '*.js': ['prettier --write', 'git add'] } })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

      expect(console.printHistory()).toMatchInlineSnapshot(`
        "
        WARN ⚠ Some of your tasks use \`git add\` command. Please remove it from the config since all modifications made by tasks will be automatically added to the git commit index.

        LOG [STARTED] Preparing lint-staged...
        LOG [SUCCESS] Preparing lint-staged...
        LOG [STARTED] Running tasks for staged files...
        LOG [STARTED] <path>/<lint-staged.config.ext> — 1 file
        LOG [STARTED] *.js — 1 file
        LOG [STARTED] prettier --write
        LOG [SUCCESS] prettier --write
        LOG [STARTED] git add
        LOG [SUCCESS] git add
        LOG [SUCCESS] *.js — 1 file
        LOG [SUCCESS] <path>/<lint-staged.config.ext> — 1 file
        LOG [SUCCESS] Running tasks for staged files...
        LOG [STARTED] Applying modifications from tasks...
        ERROR [FAILED] Prevented an empty git commit!
        LOG [STARTED] Reverting to original state because of errors...
        LOG [SUCCESS] Reverting to original state because of errors...
        LOG [STARTED] Cleaning up temporary files...
        LOG [SUCCESS] Cleaning up temporary files...
        WARN 
          ⚠ lint-staged prevented an empty git commit.
          Use the --allow-empty option to continue, or check your task configuration
        "
      `)

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('committed pretty file')
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)
    }
  )

  testWithGitIntegration(
    'creates commit when task reverts staged changed and --allow-empty is used',
    async ({ appendFile, execGit, gitCommit, readFile, writeFile }) => {
      // Create and commit a pretty file without running lint-staged
      // This way the file will be available for the next step
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m committed pretty file'])

      // Edit file to be ugly
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with prettier --write to automatically fix the file
      // Here we also pass '--allow-empty' to gitCommit because this part is not the full lint-staged
      await gitCommit({ ...configFixtures.prettierWrite, allowEmpty: true }, [
        '-m test',
        '--allow-empty',
      ])

      // Nothing was wrong so the empty commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('3')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await execGit(['diff', '-1'])).toEqual('')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    }
  )
})
