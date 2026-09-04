import path from 'node:path'

import { describe, test } from 'vitest'

import { normalizePath } from '../../lib/normalizePath.js'
import { oxfmtListDifferent } from './__fixtures__/configs.js'
import { prettyJS } from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'refuses to run when files staged with "--intent-to-add"',
    withGitIntegration(async ({ writeFile, execGit, expect, gitCommit, cwd }) => {
      expect.assertions(3)

      await writeFile('.lintstagedrc.json', JSON.stringify(oxfmtListDifferent))

      // Stage pretty file
      await writeFile('ita.js', prettyJS)
      await execGit(['add', '--intent-to-add', 'ita.js'])

      // Run lint-staged with `oxfmt --list-different` and commit pretty file
      try {
        await gitCommit()
        expect.fail('Not reached')
      } catch (error) {
        expect(error.message).toMatch(
          `lint-staged refused to run with files staged with "--intent-to-add":`
        )
        expect(error.message).toMatch(normalizePath(path.join(cwd, 'ita.js')))
      }

      // Did not commit
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
    })
  )
})
