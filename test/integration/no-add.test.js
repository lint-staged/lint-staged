import { jest } from '@jest/globals'

import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

const UGLY_FILE = `console.log('Hello, world!' )`

const PRETTY_FILE = `console.log("Hello, world!");
`

describe('lint-staged', () => {
  test(
    'should automatically add files by default',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify({
          '*.js': ['prettier --write'],
        })
      )

      await writeFile('test.js', UGLY_FILE)

      await execGit(['add', '.'])

      await gitCommit()

      // Check that the file was formatted and committed
      expect(await readFile('test.js')).toEqual(PRETTY_FILE)

      // Check that the changes were committed
      const log = await execGit(['log', '--oneline', '-1'])
      expect(log).toContain('test')
    })
  )

  test(
    'should not automatically add files when --no-add is used',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify({
          '*.js': ['prettier --write'],
        })
      )

      await writeFile('test.js', UGLY_FILE)

      await execGit(['add', '.'])

      await gitCommit({ lintStaged: { add: false } })

      // Check that the file was formatted in working directory
      expect(await readFile('test.js')).toEqual(PRETTY_FILE)

      // Check that only the original ugly file was committed
      const committedContent = await execGit(['show', 'HEAD:test.js'])
      expect(committedContent.trim()).toEqual(UGLY_FILE.trim())

      // Check that the formatted changes are in the working directory but not added
      const status = await execGit(['status', '--porcelain'])
      expect(status).toContain('M test.js') // Modified but not added
    })
  )

  test(
    'should show working directory changes when --no-add is used',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify({
          '*.js': ['prettier --write'],
        })
      )

      await writeFile('test.js', UGLY_FILE)
      await writeFile('other.js', 'const x = 1')

      await execGit(['add', 'test.js']) // Only add test.js, not other.js

      await gitCommit({ lintStaged: { add: false } })

      // Check that test.js was formatted in working directory
      expect(await readFile('test.js')).toEqual(PRETTY_FILE)

      // Check that only the original test.js was committed
      const committedContent = await execGit(['show', 'HEAD:test.js'])
      expect(committedContent.trim()).toEqual(UGLY_FILE.trim())

      // Check status shows the formatted changes as not added
      const status = await execGit(['status', '--porcelain'])
      expect(status).toContain('M test.js') // Modified but not added
      expect(status).toContain('?? other.js') // Untracked
    })
  )

  test(
    'should handle empty addable files gracefully when --no-add is used',
    withGitIntegration(async ({ execGit, gitCommit, writeFile }) => {
      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify({
          '*.js': ['echo "No-op task"'],
        })
      )

      // Create and stage a file, then modify it to create a scenario where
      // the staged file exists but the working copy might create edge cases
      await writeFile('test.js', UGLY_FILE)
      await execGit(['add', 'test.js'])

      // This should succeed and not error when there are edge cases with file processing
      // The key is that with --no-add, no git add operations should fail
      await expect(gitCommit({ lintStaged: { staging: false } })).resolves.not.toThrow()
    })
  )
})
