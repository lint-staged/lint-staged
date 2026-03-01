import { describe, test } from 'vitest'

import * as fileFixtures from '../integration/__fixtures__/files.js'
import { withGitIntegration } from '../integration/__utils__/withGitIntegration.js'
import { forkLintStagedBin } from './__utils__/forkLintStagedBin.js'

describe('lint-staged', () => {
  test(
    'throws internal errors',
    withGitIntegration(async ({ execGit, expect, writeFile, cwd }) => {
      await writeFile(
        'lint-staged.config.mjs',
        `
          export default () => {
            throw new Error('Lint-staged config failure test')
          }
        `
      )

      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      await expect(forkLintStagedBin(undefined, { cwd })).rejects.toThrow(
        'Lint-staged config failure test'
      )

      const error = await forkLintStagedBin(['--debug'], { cwd }).catch((e) => e)

      expect(error.cause.exitCode).toBe(1)
      expect(error.message).toMatch("throw new Error('Lint-staged config failure test')")
    })
  )
})
