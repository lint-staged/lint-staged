import path from 'node:path'

import { jest } from '@jest/globals'

import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'works with parent glob "../*.js"',
    withGitIntegration(async ({ cwd, execGit, gitCommit, readFile, writeFile }) => {
      // Add some empty files
      await writeFile('file.js', '')
      await writeFile('deeper/file.js', '')
      await writeFile('deeper/even/file.js', '')
      await writeFile('deeper/even/deeper/file.js', '')
      await writeFile('a/very/deep/file/path/file.js', '')

      // Include single-level parent glob in deeper config
      await writeFile(
        'deeper/even/.lintstagedrc.js',
        `module.exports = { '../*.js': (files) => files.map((f) => \`echo level-2 > \${f}\`) }`
      )

      // Stage all files
      await execGit(['add', '.'])

      // Run lint-staged with `--shell` so that tasks do their thing
      // Run in 'deeper/' so that root config is ignored
      await gitCommit({ lintStaged: { shell: true } }, path.join(cwd, 'deeper/even'))

      // Two levels above, no match
      expect(await readFile('file.js')).toEqual('')

      // One level above, match
      expect(await readFile('deeper/file.js')).toMatch('level-2')

      // Not directly in the above-level, no match
      expect(await readFile('deeper/even/file.js')).toEqual('')
      expect(await readFile('deeper/even/deeper/file.js')).toEqual('')
      expect(await readFile('a/very/deep/file/path/file.js')).toEqual('')
    })
  )
})
