import { SubprocessError } from 'nano-spawn'
import { describe, test } from 'vitest'

import * as fileFixtures from '../integration/__fixtures__/files.js'
import { withGitIntegration } from '../integration/__utils__/withGitIntegration.js'
import { getLintStagedExecutor } from './__utils__/getLintStagedExecutor.js'

describe('lint-staged', () => {
  test(
    'throws internal errors',
    withGitIntegration(async ({ execGit, expect, writeFile, cwd }) => {
      const lintStaged = getLintStagedExecutor(cwd)

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

      await expect(lintStaged()).rejects.toThrow(SubprocessError)

      const subProcessError = await lintStaged(['--debug']).catch((e) => e)

      expect(subProcessError.exitCode).toBe(1)
      expect(subProcessError.output).toMatch("throw new Error('Lint-staged config failure test')")
    })
  )
})
