import { jest } from '@jest/globals'

import { prettierListDifferent } from './__fixtures__/configs.js'
import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { normalizeWindowsNewlines } from './__utils__/normalizeWindowsNewlines.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'ignores untracked files',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile, writeFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(prettierListDifferent))

      // Stage pretty file
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Add untracked files
      await appendFile('test-untracked.js', fileFixtures.prettyJS)
      await appendFile('.gitattributes', 'binary\n')
      await writeFile('binary', Buffer.from('Hello, World!', 'binary'))

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit()

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('test-untracked.js')).toEqual(fileFixtures.prettyJS)
      expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
    })
  )

  test(
    'ingores untracked files when task fails',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile, writeFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(prettierListDifferent))

      // Stage unfixable file
      await appendFile('test.js', fileFixtures.invalidJS)
      await execGit(['add', 'test.js'])

      // Add untracked files
      await appendFile('test-untracked.js', fileFixtures.prettyJS)
      await appendFile('.gitattributes', 'binary\n')
      await writeFile('binary', Buffer.from('Hello, World!', 'binary'))

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await expect(gitCommit()).rejects.toThrow()

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await readFile('test.js')).toEqual(fileFixtures.invalidJS)
      expect(await readFile('test-untracked.js')).toEqual(fileFixtures.prettyJS)
      expect(Buffer.from(await readFile('binary'), 'binary').toString()).toEqual('Hello, World!')
    })
  )

  test(
    'restores untracked files with --hide-untracked option when no errors from linter',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage pretty file
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Create untracked file
      await appendFile('test2.js', fileFixtures.prettyJS)

      const output = await gitCommit({ lintStaged: { hideUntracked: true } })

      expect(output).toMatch('Hiding unstaged changes...')
      expect(output).toMatch('Applying modifications from tasks...')
      expect(output).toMatch('Restoring unstaged changes...')

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

      // Since file is untracked, it is still present
      const status = await execGit(['status'])
      expect(status).toMatch('test2.js')
      expect(status).toMatch('nothing added to commit but untracked files present')

      /** @todo `git` in GitHub Windows runners seem to add `\r\n` newlines in this case. */
      expect(normalizeWindowsNewlines(await readFile('test.js'))).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'restores untracked files with --hide-untracked option when errors from linter',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage ugly file
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
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test2.js')).toEqual(fileFixtures.prettyJS)
    })
  )
})
