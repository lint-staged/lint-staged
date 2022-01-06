import makeConsoleMock from 'consolemock'

import { testWithGitIntegration } from './utils/gitIntegration'

jest.unmock('lilconfig')
jest.unmock('execa')

jest.mock('../../lib/resolveConfig', () => ({
  /** Unfortunately necessary due to non-ESM tests. */
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))

jest.setTimeout(20000)

// 'pathToFileURL' is not supported with Jest + Babel
jest.mock('../../lib/dynamicImport', () => ({
  dynamicImport: jest.fn().mockImplementation(async (input) => {
    const { default: normalize } = await import('normalize-path')
    return require(normalize(input))
  }),
}))

const echoJSConfig = (echo) =>
  `module.exports = { '*.js': (files) => files.map((f) => \`echo "${echo}" > \${f}\`) }`

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

      await writeFile('.lintstagedrc.js', echoJSConfig('level-0'))
      await writeFile('deeper/.lintstagedrc.js', echoJSConfig('level-1'))
      await writeFile('deeper/even/.lintstagedrc.cjs', echoJSConfig('level-2'))

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
