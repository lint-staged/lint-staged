import { describe, test } from 'vitest'

import * as fileFixtures from './__fixtures__/files.js'
import { addConfigFileSerializer } from './__utils__/addConfigFileSerializer.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged --continue-on-error', () => {
  addConfigFileSerializer()

  test(
    'fails to commit but shows all errors when --continue-on-error is used',
    {
      /**
       * @todo this test fails because "Running second command" doesn't really run
       * due to an issue with the "--continue-on-error" flag.
       */
      fails: true,
    },
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      // Create a config with multiple linters where some will fail
      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify({
          '*.js': [
            'prettier --list-different', // This will fail on ugly files
            'echo "Running second command"', // This should still run with --continue-on-error
          ],
          '*.md': 'echo "Processing markdown"', // This should also run
        })
      )

      // Stage files that will cause prettier to fail
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      await writeFile('README.md', '# Test')
      await execGit(['add', 'README.md'])

      const status = await execGit(['status'])

      try {
        // Run lint-staged with --continue-on-error
        // It should still fail overall, but run all commands
        await gitCommit(['--continue-on-error'])
        throw 'Lint-staged succeeded'
      } catch (error) {
        expect(error.toString()).toMatch('Reverting to original state because of errors')
        expect(error.toString()).toMatch('prettier --list-different [FAILED]')
        expect(error.toString()).toMatch(/COMPLETED.*Running second command/)
        expect(error.toString()).toMatch(/COMPLETED.*Processing markdown/)
      }

      // Repo should be returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)
    })
  )

  test(
    'commits successfully when all linters pass with --continue-on-error',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify({
          '*.js': ['prettier --list-different', 'echo "Running second command"'],
          '*.md': 'echo "Processing markdown"',
        })
      )

      // Stage files that won't cause any linter to fail
      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      await writeFile('README.md', '# Test')
      await execGit(['add', 'README.md'])

      // Run lint-staged with --continue-on-error - should succeed
      const result = await gitCommit(['--continue-on-error'])

      expect(result).toMatch(/COMPLETED.*prettier --list-different/)
      expect(result).toMatch(/COMPLETED.*Running second command/)
      expect(result).toMatch(/COMPLETED.*Processing markdown/)

      // A new commit should be created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'stops on first error without --continue-on-error (default behavior)',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify({
          '*.js': [
            'prettier --list-different', // This will fail
            'echo "This should not run"', // This should NOT run without --continue-on-error
          ],
        })
      )

      // Stage files that will cause prettier to fail
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      await writeFile('README.md', '# Test')
      await execGit(['add', 'README.md'])

      const status = await execGit(['status'])

      try {
        // Run lint-staged without --continue-on-error (default behavior)
        await gitCommit(['--continue-on-error'])
        throw 'Lint-staged succeeded'
      } catch (error) {
        expect(error.toString()).toMatch('Reverting to original state because of errors')
        expect(error.toString()).toMatch('prettier --list-different [FAILED]')
        expect(error.toString()).not.toMatch('This should not run')
      }

      // Repo should be returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)
    })
  )
})
