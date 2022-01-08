import { jest } from '@jest/globals'

import { withGitIntegration } from './utils/gitIntegration.js'
import { prettierListDifferent } from './fixtures/configs.js'
import * as fileFixtures from './fixtures/files.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('integration', () => {
  test(
    'works when amending previous commit with unstaged changes',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(prettierListDifferent))

      // Edit file from previous commit
      await appendFile('README.md', '\n## Amended\n')
      await execGit(['add', 'README.md'])

      // Edit again, but keep it unstaged
      await appendFile('README.md', '\n## Edited\n')
      await appendFile('test-untracked.js', fileFixtures.prettyJS)

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit({ gitCommit: ['--amend', '--no-edit'] })

      // Nothing is wrong, so the commit was amended
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await readFile('README.md')).toMatchInlineSnapshot(`
                        "# Test

                        ## Amended

                        ## Edited
                        "
                `)
      expect(await readFile('test-untracked.js')).toEqual(fileFixtures.prettyJS)
      const status = await execGit(['status'])
      expect(status).toMatch('modified:   README.md')
      expect(status).toMatch('test-untracked.js')
      expect(status).toMatch('no changes added to commit')
    })
  )
})
