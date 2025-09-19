import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, test } from 'vitest'

import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'works with parent glob "../*.js"',
    withGitIntegration(async ({ cwd, execGit, expect, gitCommit, readFile, writeFile }) => {
      // Add some empty files
      await writeFile('file.js', '')
      await writeFile('deeper/file.js', '')
      await writeFile('deeper/even/file.js', '')
      await writeFile('deeper/even/deeper/file.js', '')
      await writeFile('a/very/deep/file/path/file.js', '')

      const script = path.join(cwd, 'deeper', 'even', 'script.mjs')

      await writeFile(
        script,
        `
        import fs from 'node:fs/promises'
        import path from 'node:path' 

        const files = process.argv.slice(2)

        for (const file of files) {
          await fs.writeFile(file, 'level-2')
        }
        `
      )

      await fs.chmod(script, '755')

      // Include single-level parent glob in deeper config
      await writeFile(
        'deeper/even/lint-staged.config.mjs',
        `
        export default { '../*.js': "node script.mjs" }
        `
      )

      // Stage all files
      await execGit(['add', '.'])

      // Run in 'deeper/even' so that root config is ignored
      await gitCommit(undefined, path.join(cwd, 'deeper', 'even'))

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
