import { jest } from '@jest/globals'

import { normalizeWindowsNewlines } from './utils/windowsNewLines.js'
import { addConfigFileSerializer } from './utils/configFilepathSerializer.js'
import { withGitIntegration } from './utils/gitIntegration.js'
import * as fileFixtures from './fixtures/files.js'
import * as configFixtures from './fixtures/configs.js'

jest.setTimeout(20000)
jest.retryTimes(2)

addConfigFileSerializer()

describe('integration', () => {
  test(
    'commits partial change from partially staged file when no errors from linter',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage pretty file
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Edit pretty file but do not stage changes
      const appended = `\nconsole.log("test");\n`
      await appendFile('test.js', appended)

      expect(await gitCommit()).toMatchInlineSnapshot(`
        "[STARTED] Preparing lint-staged...
        [SUCCESS] Preparing lint-staged...
        [STARTED] Hiding unstaged changes to partially staged files...
        [SUCCESS] Hiding unstaged changes to partially staged files...
        [STARTED] Running tasks for staged files...
        [STARTED] .lintstagedrc.json — 1 file
        [STARTED] *.js — 1 file
        [STARTED] prettier --list-different
        [SUCCESS] prettier --list-different
        [SUCCESS] *.js — 1 file
        [SUCCESS] .lintstagedrc.json — 1 file
        [SUCCESS] Running tasks for staged files...
        [STARTED] Applying modifications from tasks...
        [SUCCESS] Applying modifications from tasks...
        [STARTED] Restoring unstaged changes to partially staged files...
        [SUCCESS] Restoring unstaged changes to partially staged files...
        [STARTED] Cleaning up temporary files...
        [SUCCESS] Cleaning up temporary files..."
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
    })
  )

  test(
    'commits partial change from partially staged file when no errors from linter and linter modifies file',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Edit ugly file but do not stage changes
      const appended = '\n\nconsole.log("test");\n'
      await appendFile('test.js', appended)

      await gitCommit()

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
    })
  )

  test(
    'fails to commit partial change from partially staged file when errors from linter',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Edit ugly file but do not stage changes
      const appended = '\nconsole.log("test");\n'
      await appendFile('test.js', appended)
      const status = await execGit(['status'])

      // Run lint-staged with `prettier --list-different` to break the linter
      await expect(gitCommit(configFixtures.prettierListDifferent)).rejects.toThrowError(
        'Reverting to original state because of errors'
      )

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS + appended)
    })
  )

  test(
    'fails to commit partial change from partially staged file when errors from linter and linter modifies files',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Add unfixable file to commit so `prettier --write` breaks
      await appendFile('test.js', fileFixtures.invalidJS)
      await execGit(['add', 'test.js'])

      // Edit unfixable file but do not stage changes
      const appended = '\nconsole.log("test");\n'
      await appendFile('test.js', appended)
      const status = await execGit(['status'])

      await expect(gitCommit()).rejects.toThrowError(
        'Reverting to original state because of errors'
      )

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test.js')).toEqual(fileFixtures.invalidJS + appended)
    })
  )
})
