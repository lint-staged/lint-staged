import path from 'path'

import makeConsoleMock from 'consolemock'
import fs from 'fs-extra'

import { addConfigFileSerializer } from './utils/configFilepathSerializer'
import { testWithGitIntegration } from './utils/gitIntegration'
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
    'skips backup and revert with --no-stash',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Stage pretty file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with --no-stash
      await gitCommit({
        ...configFixtures.prettierWrite,
        stash: false,
      })

      expect(console.printHistory()).toMatchInlineSnapshot(`
        "
        WARN ⚠ Skipping backup because \`--no-stash\` was used.

        LOG [STARTED] Preparing lint-staged...
        LOG [SUCCESS] Preparing lint-staged...
        LOG [STARTED] Running tasks for staged files...
        LOG [STARTED] <path>/<lint-staged.config.ext> — 1 file
        LOG [STARTED] *.js — 1 file
        LOG [STARTED] prettier --write
        LOG [SUCCESS] prettier --write
        LOG [SUCCESS] *.js — 1 file
        LOG [SUCCESS] <path>/<lint-staged.config.ext> — 1 file
        LOG [SUCCESS] Running tasks for staged files...
        LOG [STARTED] Applying modifications from tasks...
        LOG [SUCCESS] Applying modifications from tasks..."
      `)

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    }
  )

  testWithGitIntegration(
    'aborts commit without reverting with --no-stash 1',
    async ({ appendFile, cwd, execGit, gitCommit, readFile }) => {
      // Stage file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with action that does horrible things to the file, causing a merge conflict
      const testFile = path.resolve(cwd, 'test.js')
      await expect(
        gitCommit({
          config: {
            '*.js': () => {
              fs.writeFileSync(testFile, Buffer.from(fileFixtures.invalidJS, 'binary'))
              return `prettier --write ${testFile}`
            },
          },
          stash: false,
        })
      ).rejects.toThrowError()

      expect(console.printHistory()).toMatchInlineSnapshot(`
        "
        WARN ⚠ Skipping backup because \`--no-stash\` was used.

        LOG [STARTED] Preparing lint-staged...
        LOG [SUCCESS] Preparing lint-staged...
        LOG [STARTED] Hiding unstaged changes to partially staged files...
        LOG [SUCCESS] Hiding unstaged changes to partially staged files...
        LOG [STARTED] Running tasks for staged files...
        LOG [STARTED] <path>/<lint-staged.config.ext> — 1 file
        LOG [STARTED] *.js — 1 file
        LOG [STARTED] prettier --write <path>
        LOG [SUCCESS] prettier --write <path>
        LOG [SUCCESS] *.js — 1 file
        LOG [SUCCESS] <path>/<lint-staged.config.ext> — 1 file
        LOG [SUCCESS] Running tasks for staged files...
        LOG [STARTED] Applying modifications from tasks...
        LOG [SUCCESS] Applying modifications from tasks...
        LOG [STARTED] Restoring unstaged changes to partially staged files...
        ERROR [FAILED] Unstaged changes could not be restored due to a merge conflict!
        ERROR 
          ✖ lint-staged failed due to a git error."
      `)

      // Something was wrong so the commit was aborted
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status', '--porcelain'])).toMatchInlineSnapshot(`"UU test.js"`)
      // Without revert, the merge conflict is left in-place
      expect(await readFile('test.js')).toMatchInlineSnapshot(`
        "<<<<<<< ours
        module.exports = {
          foo: \\"bar\\",
        };
        =======
        const obj = {
            'foo': 'bar'
        >>>>>>> theirs
        "
      `)
    }
  )

  testWithGitIntegration(
    'aborts commit without reverting with --no-stash 2',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      await appendFile('test2.js', fileFixtures.invalidJS)
      await execGit(['add', 'test2.js'])

      // Run lint-staged with --no-stash
      await expect(
        gitCommit({
          ...configFixtures.prettierWrite,
          stash: false,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"lint-staged failed"`)

      const output = console.printHistory()
      expect(output).toMatch('Skipping backup because `--no-stash` was used')

      // Something was wrong, so the commit was aborted
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS) // file was still fixed
      expect(await readFile('test2.js')).toEqual(fileFixtures.invalidJS)
    }
  )
})
