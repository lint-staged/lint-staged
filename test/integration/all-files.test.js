import makeConsoleMock from 'consolemock'
import { describe, test } from 'vitest'

import lintStaged from '../../lib/index.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged --all', () => {
  test(
    'runs on all tracked files when --all is used',
    withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
      const globalConsoleTemp = console
      console = makeConsoleMock()

      // Create and commit multiple files
      await appendFile('committed.js', fileFixtures.uglyJS)
      await appendFile('tracked.js', fileFixtures.uglyJS)
      await execGit(['add', 'committed.js', 'tracked.js'])
      await execGit(['commit', '-m', 'Add files'])

      // Run lint-staged with --all (nothing is currently staged, but files are tracked)
      const passed = await lintStaged({
        all: true,
        allowEmpty: true,  // Need to allow empty commits when using --all
        config: { '*.js': 'echo' },
        cwd,
        stash: false,
      })

      // Should succeed since echo always succeeds
      expect(passed).toEqual(true)
      // Verify files were processed
      const history = console.printHistory()
      expect(history).toMatch(/\*\.js — 2 files/)

      console = globalConsoleTemp
    })
  )

  test(
    'works with per-directory configs',
    withGitIntegration(async ({ appendFile, cwd, execGit, expect, writeFile }) => {
      const globalConsoleTemp = console
      console = makeConsoleMock()

      // Create subdirectory with config
      await writeFile('.lintstagedrc.json', JSON.stringify({ '*.js': 'echo' }))
      await execGit(['add', '.lintstagedrc.json'])
      await execGit(['commit', '-m', 'Add root config'])

      await appendFile('root.js', fileFixtures.uglyJS)
      await appendFile('sub/nested.js', fileFixtures.uglyJS)
      await execGit(['add', 'root.js', 'sub/nested.js'])
      await execGit(['commit', '-m', 'Add files'])

      const passed = await lintStaged({
        all: true,
        allowEmpty: true,
        cwd,
        stash: false,
      })

      expect(passed).toEqual(true)
      const history = console.printHistory()
      // Should process both js files
      expect(history).toMatch(/\*\.js — 2 files/)

      console = globalConsoleTemp
    })
  )

  test(
    'does not run on untracked files',
    withGitIntegration(async ({ appendFile, cwd, execGit, expect }) => {
      const globalConsoleTemp = console
      console = makeConsoleMock()

      // Create and commit tracked file
      await appendFile('tracked.js', fileFixtures.uglyJS)
      await execGit(['add', 'tracked.js'])
      await execGit(['commit', '-m', 'Add tracked'])

      // Create untracked file (don't add to git)
      await appendFile('untracked.js', fileFixtures.uglyJS)

      const passed = await lintStaged({
        all: true,
        allowEmpty: true,
        config: { '*.js': 'echo' },
        cwd,
        stash: false,
      })

      expect(passed).toEqual(true)
      const history = console.printHistory()
      // Should only process 1 tracked file, not the untracked one
      expect(history).toMatch(/\*\.js — 1 file/)  // Verify only 1 JS file was processed
      expect(history).not.toMatch(/untracked\.js/)  // Verify untracked file was not processed

      console = globalConsoleTemp
    })
  )

  test(
    'works in empty repository with no files',
    withGitIntegration(async ({ cwd, expect }) => {
      const globalConsoleTemp = console
      console = makeConsoleMock()

      const passed = await lintStaged({
        all: true,
        config: { '*.js': 'prettier --list-different' },
        cwd,
        stash: false,
      })

      expect(passed).toEqual(true)
      expect(console.printHistory()).toMatch('could not find any')

      console = globalConsoleTemp
    })
  )
})
