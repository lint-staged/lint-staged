import makeConsoleMock from 'consolemock'
import { describe, test } from 'vitest'

import lintStaged from '../../lib/index.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'supports overriding file list using --diff',
    withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
      const globalConsoleTemp = console
      console = makeConsoleMock()

      // Commit ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m', 'ugly'], { cwd })

      const hashes = (await execGit(['log', '--format=format:%H'])).trim().split('\n')
      expect(hashes).toHaveLength(2)

      // Run lint-staged with `--diff` between the two commits.
      // Nothing is staged at this point, so don't rung `gitCommit`
      const passed = await lintStaged({
        config: { '*.js': 'prettier --list-different' },
        cwd,
        diff: `${hashes[1]}...${hashes[0]}`,
        stash: false,
      })

      // Lint-staged failed because commit diff contains ugly file
      expect(passed).toEqual(false)

      expect(console.printHistory()).toMatch('prettier --list-different:')
      expect(console.printHistory()).toMatch('test.js')

      console = globalConsoleTemp
    })
  )

  test(
    'supports overriding default --diff-filter',
    withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
      const globalConsoleTemp = console
      console = makeConsoleMock()

      // Stage ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with `--diff-filter=D` to include only deleted files.
      const passed = await lintStaged({
        config: { '*.js': 'prettier --list-different' },
        cwd,
        diffFilter: 'D',
        stash: false,
      })

      // Lint-staged passed because no matching (deleted) files
      expect(passed).toEqual(true)

      expect(console.printHistory()).toMatch('No staged files found')

      console = globalConsoleTemp
    })
  )

  test(
    'supports staged deleted files processed by linter',
    withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
      const globalConsoleTemp = console
      console = makeConsoleMock()

      // Stage and commit ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m', 'test'])

      // Staged deleted file
      await execGit(['rm', 'test.js'])

      // Run lint-staged with `--diff-filter=D` to include only deleted files.
      const passed = await lintStaged({
        config: { '*.js': 'prettier --list-different --no-error-on-unmatched-pattern' },
        cwd,
        diffFilter: 'D',
      })

      expect(passed).toEqual(true)
      expect(console.printHistory()).not.toMatch('No files matching the pattern were found:')

      console = globalConsoleTemp
    })
  )

  test(
    'supports staged deleted files restored by linter',
    withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
      const globalConsoleTemp = console
      console = makeConsoleMock()

      // Stage and commit ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      await execGit(['commit', '-m', 'test'])

      // Staged deleted file
      await execGit(['rm', 'test.js'])

      // Run lint-staged with `--diff-filter=D` to include only deleted files.
      // Use git to restore deleted staged file and then prettify it
      const passed = await lintStaged({
        config: { '*.js': ['git reset --', 'git checkout --', 'prettier --write'] },
        cwd,
        diffFilter: 'D',
      })

      expect(passed).toEqual(false)
      expect(console.printHistory()).not.toMatch('No files matching the pattern were found:')
      expect(console.printHistory()).toMatch('lint-staged prevented an empty git commit.')

      console = globalConsoleTemp
    })
  )

  test(
    'supports staged deleted files not processed by linter',
    withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
      const globalConsoleTemp = console
      console = makeConsoleMock()

      // Stage and commit file
      await appendFile('test.txt', 'text contents')
      await execGit(['add', 'test.txt'])
      await execGit(['commit', '-m', 'test'])

      // Staged deleted file not subject to linter processing
      await execGit(['rm', 'test.txt'])

      // Run lint-staged with `--diff-filter=D` to include only deleted files.
      const passed = await lintStaged({
        config: {
          '*.js': 'prettier --list-different',
          '*': () => [
            /* despite empty array, this triggers processing of all files */
          ],
        },
        cwd,
        diffFilter: 'D',
      })

      expect(passed).toEqual(true)
      expect(console.printHistory()).toMatch('Running tasks for staged files...')
      expect(console.printHistory()).not.toMatch('fatal: pathspec')
      expect(console.printHistory()).not.toMatch('did not match any files')

      console = globalConsoleTemp
    })
  )
})
