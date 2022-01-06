import path from 'path'

import makeConsoleMock from 'consolemock'
import fs from 'fs-extra'

import lintStaged from '../../lib/index'

import { addConfigFileSerializer } from './utils/configFilepathSerializer'
import { testWithGitIntegration } from './utils/gitIntegration'
import * as fileFixtures from './fixtures/files'

jest.unmock('execa')
jest.setTimeout(20000)

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

addConfigFileSerializer()

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
    'does not resurrect removed files due to git bug when tasks pass',
    async ({ appendFile, cwd, execGit }) => {
      const readmeFile = path.resolve(cwd, 'README.md')
      await fs.remove(readmeFile) // Remove file from previous commit
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])
      await lintStaged({ cwd, config: { '*.{js,md}': 'prettier --list-different' } })
      const exists = await fs.exists(readmeFile)
      expect(exists).toEqual(false)
    }
  )

  testWithGitIntegration(
    'does not resurrect removed files in complex case',
    async ({ appendFile, cwd, execGit, readFile }) => {
      // Add file to index, and remove it from disk
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])
      const testFile = path.join(cwd, 'test.js')
      await fs.remove(testFile)

      // Rename file in index, and remove it from disk
      const readmeFile = path.join(cwd, 'README.md')
      const readme = await readFile(readmeFile)
      await fs.remove(readmeFile)
      await execGit(['add', readmeFile])
      const newReadmeFile = path.join(cwd, 'README_NEW.md')
      await appendFile(newReadmeFile, readme)
      await execGit(['add', newReadmeFile])
      await fs.remove(newReadmeFile)

      const status = await execGit(['status', '--porcelain'])
      expect(status).toMatchInlineSnapshot(`
              "RD README.md -> README_NEW.md
              AD test.js"
          `)

      await lintStaged({ cwd, config: { '*.{js,md}': 'prettier --list-different' } })
      expect(await fs.exists(testFile)).toEqual(false)
      expect(await fs.exists(newReadmeFile)).toEqual(false)
      expect(await execGit(['status', '--porcelain'])).toEqual(status)
    }
  )

  testWithGitIntegration(
    'does not resurrect removed files due to git bug when tasks fail',
    async ({ appendFile, cwd, execGit }) => {
      const readmeFile = path.resolve(cwd, 'README.md')
      await fs.remove(readmeFile) // Remove file from previous commit
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      await expect(
        lintStaged({ allowEmpty: true, cwd, config: { '*.{js,md}': 'prettier --list-different' } })
      ).resolves.toEqual(false)
      const exists = await fs.exists(readmeFile)
      expect(exists).toEqual(false)
    }
  )
})
