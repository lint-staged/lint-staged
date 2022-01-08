import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import { normalizeWindowsNewlines } from './utils/windowsNewLines.mjs'
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
    'commits partial change from partially staged file when no errors from linter',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Stage pretty file
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Edit pretty file but do not stage changes
      const appended = `\nconsole.log("test");\n`
      await appendFile('test.js', appended)

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit(configFixtures.prettierListDifferent)

      expect(console.printHistory()).toMatchInlineSnapshot(`
        "
        LOG [STARTED] Preparing lint-staged...
        LOG [SUCCESS] Preparing lint-staged...
        LOG [STARTED] Hiding unstaged changes to partially staged files...
        LOG [SUCCESS] Hiding unstaged changes to partially staged files...
        LOG [STARTED] Running tasks for staged files...
        LOG [STARTED] <path>/<lint-staged.config.ext> — 1 file
        LOG [STARTED] *.js — 1 file
        LOG [STARTED] prettier --list-different
        LOG [SUCCESS] prettier --list-different
        LOG [SUCCESS] *.js — 1 file
        LOG [SUCCESS] <path>/<lint-staged.config.ext> — 1 file
        LOG [SUCCESS] Running tasks for staged files...
        LOG [STARTED] Applying modifications from tasks...
        LOG [SUCCESS] Applying modifications from tasks...
        LOG [STARTED] Restoring unstaged changes to partially staged files...
        LOG [SUCCESS] Restoring unstaged changes to partially staged files...
        LOG [STARTED] Cleaning up temporary files...
        LOG [SUCCESS] Cleaning up temporary files..."
      `)

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

      // Latest commit contains pretty file
      // `git show` strips empty line from here here
      expect(await execGit(['show', 'HEAD:test.js'])).toEqual(fileFixtures.prettyJS.trim())

      // Since edit was not staged, the file is still modified
      const status = await execGit(['status'])
      expect(status).toMatch('modified:   test.js')
      expect(status).toMatch('no changes added to commit')
      /** @todo `git` in GitHub Windows runners seem to add `\r\n` newlines in this case. */
      expect(normalizeWindowsNewlines(await readFile('test.js'))).toEqual(
        fileFixtures.prettyJS + appended
      )
    }
  )

  testWithGitIntegration(
    'commits partial change from partially staged file when no errors from linter and linter modifies file',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Stage ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Edit ugly file but do not stage changes
      const appended = '\n\nconsole.log("test");\n'
      await appendFile('test.js', appended)

      // Run lint-staged with `prettier --write` and commit pretty file
      await gitCommit(configFixtures.prettierWrite)

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

      // Latest commit contains pretty file
      // `git show` strips empty line from here here
      expect(await execGit(['show', 'HEAD:test.js'])).toEqual(fileFixtures.prettyJS.trim())

      // Nothing is staged
      const status = await execGit(['status'])
      expect(status).toMatch('modified:   test.js')
      expect(status).toMatch('no changes added to commit')

      // File is pretty, and has been edited
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS + appended)
    }
  )

  testWithGitIntegration(
    'fails to commit partial change from partially staged file when errors from linter',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Stage ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Edit ugly file but do not stage changes
      const appended = '\nconsole.log("test");\n'
      await appendFile('test.js', appended)
      const status = await execGit(['status'])

      // Run lint-staged with `prettier --list-different` to break the linter
      await expect(gitCommit(configFixtures.prettierListDifferent)).rejects.toThrowError()

      const output = console.printHistory()
      expect(output).toMatch('Reverting to original state because of errors')

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS + appended)
    }
  )

  testWithGitIntegration(
    'fails to commit partial change from partially staged file when errors from linter and linter modifies files',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Add unfixable file to commit so `prettier --write` breaks
      await appendFile('test.js', fileFixtures.invalidJS)
      await execGit(['add', 'test.js'])

      // Edit unfixable file but do not stage changes
      const appended = '\nconsole.log("test");\n'
      await appendFile('test.js', appended)
      const status = await execGit(['status'])

      // Run lint-staged with `prettier --write` to break the linter
      try {
        await gitCommit(configFixtures.prettierWrite)
      } catch (error) {
        expect(error.message).toMatchInlineSnapshot(`"lint-staged failed"`)
      }

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test.js')).toEqual(fileFixtures.invalidJS + appended)
    }
  )
})
