import { describe, test } from 'vitest'

import { withGitIntegration } from './__utils__/withGitIntegration.js'

const UGLY_FILE = `console.log('Hello, world!', unreferencedVariable)`

const PRETTY_FILE = `console.log("Hello, world!", unreferencedVariable);
`

describe('lint-staged', () => {
  test(
    'should revert linter changes by default',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify({
          '*.js': ['prettier --write', 'node'],
        })
      )

      await writeFile('test.js', UGLY_FILE)

      await execGit(['add', '.'])

      await expect(gitCommit()).rejects.toThrow(
        'ReferenceError: unreferencedVariable is not defined'
      )

      expect(await readFile('test.js')).toEqual(UGLY_FILE)
    })
  )

  test(
    'should not revert linter changes when --no-revert is used',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile(
        '.lintstagedrc.json',
        JSON.stringify({
          '*.js': ['prettier --write', 'node'],
        })
      )

      await writeFile('test.js', UGLY_FILE)

      await execGit(['add', '.'])

      await expect(
        gitCommit({
          lintStaged: { revert: false },
        })
      ).rejects.toThrow('ReferenceError: unreferencedVariable is not defined')

      expect(await readFile('test.js')).toEqual(PRETTY_FILE)
    })
  )
})
