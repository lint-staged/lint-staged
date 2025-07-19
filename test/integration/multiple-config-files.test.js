import path from 'node:path'

import { jest as jestGlobals } from '@jest/globals'

import { normalizePath } from '../../lib/normalizePath.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jestGlobals.setTimeout(20000)
jestGlobals.retryTimes(2)

describe('lint-staged', () => {
  const getScript = (echo) => `
    import fs from 'node:fs/promises'
    import path from 'node:path'

    const files = process.argv.slice(2)

    for (const file of files) {
      await fs.writeFile(file, '${echo}')
    }
  `

  const SCRIPT_FILE = 'script.mjs'

  const LINT_STAGED_CONFIG = `
    import path from 'node:path'
    import { fileURLToPath } from 'node:url'

    const __dirname = path.dirname(fileURLToPath(import.meta.url))

    export default { '*.js': \`node \${path.resolve(__dirname, '${SCRIPT_FILE}')}\` }
  `

  test(
    'supports multiple configuration files',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      // Add some empty files
      await writeFile('file.js', '')
      await writeFile('deeper/file.js', '')
      await writeFile('deeper/even/file.js', '')
      await writeFile('deeper/even/deeper/file.js', '')
      await writeFile('a/very/deep/file/path/file.js', '')

      await writeFile(SCRIPT_FILE, getScript('level-0'))
      await writeFile('lint-staged.config.mjs', LINT_STAGED_CONFIG)

      await writeFile(`deeper/${SCRIPT_FILE}`, getScript('level-1'))
      await writeFile('deeper/lint-staged.config.mjs', LINT_STAGED_CONFIG)

      await writeFile(`deeper/even/${SCRIPT_FILE}`, getScript('level-2'))
      await writeFile('deeper/even/lint-staged.config.mjs', LINT_STAGED_CONFIG)

      // Stage all files
      await execGit(['add', '.'])

      await gitCommit()

      // 'file.js' matched 'lint-staged.config.mjs'
      expect(await readFile('file.js')).toMatch('level-0')

      // 'deeper/file.js' matched 'deeper/lint-staged.config.mjs'
      expect(await readFile('deeper/file.js')).toMatch('level-1')

      // 'deeper/even/file.js' matched 'deeper/even/lint-staged.config.mjs'
      expect(await readFile('deeper/even/file.js')).toMatch('level-2')

      // 'deeper/even/deeper/file.js' matched from parent 'deeper/even/lint-staged.config.mjs'
      expect(await readFile('deeper/even/deeper/file.js')).toMatch('level-2')

      // 'a/very/deep/file/path/file.js' matched 'lint-staged.config.mjs'
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

      const ECHO_RELATIVE = `
        import fs from 'node:fs/promises'
        import path from 'node:path' 
    
        const files = process.argv.slice(2)
    
        for (const file of files) {
          await fs.writeFile(file, \`\${file}\`)
        }
      `

      await writeFile(SCRIPT_FILE, ECHO_RELATIVE)
      await writeFile('lint-staged.config.mjs', LINT_STAGED_CONFIG)

      await writeFile(`deeper/${SCRIPT_FILE}`, ECHO_RELATIVE)
      await writeFile('deeper/lint-staged.config.mjs', LINT_STAGED_CONFIG)

      await writeFile(`deeper/even/${SCRIPT_FILE}`, ECHO_RELATIVE)
      await writeFile('deeper/even/lint-staged.config.mjs', LINT_STAGED_CONFIG)

      // Stage all files
      await execGit(['add', '.'])

      await gitCommit({ lintStaged: { relative: true } })

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

      await writeFile(SCRIPT_FILE, getScript('level-0'))
      await writeFile('lint-staged.config.mjs', LINT_STAGED_CONFIG)

      await writeFile(`deeper/${SCRIPT_FILE}`, getScript('level-1'))
      await writeFile('deeper/lint-staged.config.mjs', LINT_STAGED_CONFIG)

      await writeFile(`deeper/even/${SCRIPT_FILE}`, getScript('level-2'))
      await writeFile('deeper/even/lint-staged.config.mjs', LINT_STAGED_CONFIG)

      // Stage all files
      await execGit(['add', '.'])

      // Run in 'deeper/' so that root config is ignored
      await gitCommit(undefined, path.resolve(cwd, 'deeper'))

      // 'file.js' was ignored
      expect(await readFile('file.js')).toEqual('')

      // 'deeper/file.js' matched 'deeper/lint-staged.config.mjs'
      expect(await readFile('deeper/file.js')).toMatch('level-1')

      // 'deeper/even/file.js' matched 'deeper/even/lint-staged.config.mjs'
      expect(await readFile('deeper/even/file.js')).toMatch('level-2')

      // 'deeper/even/deeper/file.js' matched from parent 'deeper/even/lint-staged.config.mjs'
      expect(await readFile('deeper/even/deeper/file.js')).toMatch('level-2')

      // 'a/very/deep/file/path/file.js' was ignored
      expect(await readFile('a/very/deep/file/path/file.js')).toEqual('')
    })
  )
})
