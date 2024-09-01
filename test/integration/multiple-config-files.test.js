import path from 'node:path'

import { jest as jestGlobals } from '@jest/globals'

import { normalizePath } from '../../lib/normalizePath.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jestGlobals.setTimeout(20000)
jestGlobals.retryTimes(2)

describe('lint-staged', () => {
  test(
    'supports multiple configuration files',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      // Add some empty files
      await writeFile('file.js', '')
      await writeFile('deeper/file.js', '')
      await writeFile('deeper/even/file.js', '')
      await writeFile('deeper/even/deeper/file.js', '')
      await writeFile('a/very/deep/file/path/file.js', '')

      const echoJSConfig = (echo) =>
        `module.exports = { '*.js': (files) => files.map((f) => \`echo "${echo}" > \${f}\`) }`

      await writeFile('.lintstagedrc.js', echoJSConfig('level-0'))
      await writeFile('deeper/.lintstagedrc.js', echoJSConfig('level-1'))
      await writeFile('deeper/even/.lintstagedrc.js', echoJSConfig('level-2'))

      // Stage all files
      await execGit(['add', '.'])

      // Run lint-staged with `--shell` so that tasks do their thing
      await gitCommit({ lintStaged: { shell: true } })

      // 'file.js' matched '.lintstagedrc.json'
      expect(await readFile('file.js')).toMatch('level-0')

      // 'deeper/file.js' matched 'deeper/.lintstagedrc.json'
      expect(await readFile('deeper/file.js')).toMatch('level-1')

      // 'deeper/even/file.js' matched 'deeper/even/.lintstagedrc.json'
      expect(await readFile('deeper/even/file.js')).toMatch('level-2')

      // 'deeper/even/deeper/file.js' matched from parent 'deeper/even/.lintstagedrc.json'
      expect(await readFile('deeper/even/deeper/file.js')).toMatch('level-2')

      // 'a/very/deep/file/path/file.js' matched '.lintstagedrc.json'
      expect(await readFile('a/very/deep/file/path/file.js')).toMatch('level-0')
    })
  )

  test(
    'supports multiple configuration files with --relative',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      // Add some empty files
      await writeFile('file.js', '')
      await writeFile('deeper/file.js', '')
      await writeFile('deeper/even/file.js', '')
      await writeFile('deeper/even/deeper/file.js', '')
      await writeFile('a/very/deep/file/path/file.js', '')

      const echoJSConfig = `module.exports = { '*.js': (files) => files.map((f) => \`echo \${f} > \${f}\`) }`

      await writeFile('.lintstagedrc.js', echoJSConfig)
      await writeFile('deeper/.lintstagedrc.js', echoJSConfig)
      await writeFile('deeper/even/.lintstagedrc.js', echoJSConfig)

      // Stage all files
      await execGit(['add', '.'])

      // Run lint-staged with `--shell` so that tasks do their thing
      await gitCommit({ lintStaged: { relative: true, shell: true } })

      // 'file.js' is relative to '.'
      expect(await readFile('file.js')).toMatch('file.js')

      // 'deeper/file.js' is relative to 'deeper/'
      expect(await readFile('deeper/file.js')).toMatch('file.js')

      // 'deeper/even/file.js' is relative to 'deeper/even/'
      expect(await readFile('deeper/even/file.js')).toMatch('file.js')

      // 'deeper/even/deeper/file.js' is relative to parent 'deeper/even/'
      expect(await readFile('deeper/even/deeper/file.js')).toMatch(normalizePath('deeper/file.js'))

      // 'a/very/deep/file/path/file.js' is relative to root '.'
      expect(await readFile('a/very/deep/file/path/file.js')).toMatch(
        normalizePath('a/very/deep/file/path/file.js')
      )
    })
  )

  test(
    'ignores multiple configs files outside cwd',
    withGitIntegration(async ({ cwd, execGit, gitCommit, readFile, writeFile }) => {
      // Add some empty files
      await writeFile('file.js', '')
      await writeFile('deeper/file.js', '')
      await writeFile('deeper/even/file.js', '')
      await writeFile('deeper/even/deeper/file.js', '')
      await writeFile('a/very/deep/file/path/file.js', '')

      const echoJSConfig = (echo) =>
        `module.exports = { '*.js': (files) => files.map((f) => \`echo ${echo} > \${f}\`) }`

      await writeFile('.lintstagedrc.js', echoJSConfig('level-0'))
      await writeFile('deeper/.lintstagedrc.js', echoJSConfig('level-1'))
      await writeFile('deeper/even/.lintstagedrc.js', echoJSConfig('level-2'))

      // Stage all files
      await execGit(['add', '.'])

      // Run lint-staged with `--shell` so that tasks do their thing
      // Run in 'deeper/' so that root config is ignored
      await gitCommit({ lintStaged: { shell: true } }, path.join(cwd, 'deeper'))

      // 'file.js' was ignored
      expect(await readFile('file.js')).toEqual('')

      // 'deeper/file.js' matched 'deeper/.lintstagedrc.json'
      expect(await readFile('deeper/file.js')).toMatch('level-1')

      // 'deeper/even/file.js' matched 'deeper/even/.lintstagedrc.json'
      expect(await readFile('deeper/even/file.js')).toMatch('level-2')

      // 'deeper/even/deeper/file.js' matched from parent 'deeper/even/.lintstagedrc.json'
      expect(await readFile('deeper/even/deeper/file.js')).toMatch('level-2')

      // 'a/very/deep/file/path/file.js' was ignored
      expect(await readFile('a/very/deep/file/path/file.js')).toEqual('')
    })
  )
})
