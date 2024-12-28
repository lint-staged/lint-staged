import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import lintStaged from '../../lib/index.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'supports overriding file list using --diff',
    withGitIntegration(async ({ appendFile, cwd, execGit }) => {
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
    withGitIntegration(async ({ appendFile, cwd, execGit }) => {
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
})
