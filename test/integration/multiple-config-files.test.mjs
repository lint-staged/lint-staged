import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

const { testWithGitIntegration } = await import('./utils/gitIntegration.mjs')

jest.setTimeout(20000)

const echoJSConfig = (echo) =>
  `export default { '*.js': (files) => files.map((f) => \`echo "${echo}" > \${f}\`) }`

describe('integration', () => {
  const globalConsoleTemp = console

  beforeAll(() => {
    console = makeConsoleMock()
  })

  afterEach(async () => {
    console.clearHistory()
  })

  afterAll(() => {
    console = globalConsoleTemp
  })

  testWithGitIntegration(
    'supports multiple configuration files',
    async ({ execGit, gitCommit, readFile, writeFile }) => {
      // Add some empty files
      await writeFile('file.js', '')
      await writeFile('deeper/file.js', '')
      await writeFile('deeper/even/file.js', '')
      await writeFile('deeper/even/deeper/file.js', '')
      await writeFile('a/very/deep/file/path/file.js', '')

      await writeFile('.lintstagedrc.mjs', echoJSConfig('level-0'))
      await writeFile('deeper/.lintstagedrc.mjs', echoJSConfig('level-1'))
      await writeFile('deeper/even/.lintstagedrc.mjs', echoJSConfig('level-2'))

      // Stage all files
      await execGit(['add', '.'])

      // Run lint-staged with `--shell` so that tasks do their thing
      await gitCommit({ shell: true })

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
    }
  )
})
