import { jest } from '@jest/globals'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { addConfigFileSerializer } from './__utils__/addConfigFileSerializer.js'
import { normalizeWindowsNewlines } from './__utils__/normalizeWindowsNewlines.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

addConfigFileSerializer()

describe('lint-staged', () => {
  test(
    'restores untracked files when no errors from linter',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage and commit pretty files
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m', 'add test file'])

      // Stage pretty file
      const appended = `\nconsole.log("test");\n`
      await appendFile('test.js', appended)
      await execGit(['add', 'test.js'])

      // Create untracked file
      await appendFile('test2.js', fileFixtures.prettyJS)

      const output = await gitCommit({ lintStaged: { hideUntracked: true } })

      expect(output).toMatch('Hiding untracked files...')
      expect(output).toMatch('Applying modifications from tasks...')
      expect(output).toMatch('Restoring untracked files...')

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('3')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

      // Since file is untracked, it is still present
      const status = await execGit(['status'])
      expect(status).toMatch('test2.js')
      expect(status).toMatch('nothing added to commit but untracked files present')

      /** @todo `git` in GitHub Windows runners seem to add `\r\n` newlines in this case. */
      expect(normalizeWindowsNewlines(await readFile('test.js'))).toEqual(
        fileFixtures.prettyJS + appended
      )
    })
  )

  test(
    'restores untracked files when errors from linter',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage and commit pretty files
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m', 'add test file'])

      // Stage pretty file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Create untracked file
      await appendFile('test2.js', fileFixtures.prettyJS)

      const status = await execGit(['status'])

      // Run lint-staged with `prettier --list-different` to break the linter
      await expect(gitCommit({ lintStaged: { hideUntracked: true } })).rejects.toThrow(
        'Reverting to original state because of errors'
      )

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('add test file')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test2.js')).toEqual(fileFixtures.prettyJS)
    })
  )
})
