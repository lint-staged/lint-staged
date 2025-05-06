import { jest } from '@jest/globals'

import * as configFixtures from '../integration/__fixtures__/configs.js'
import * as fileFixtures from '../integration/__fixtures__/files.js'
import { withGitIntegration } from '../integration/__utils__/withGitIntegration.js'
import { getLintStagedExecutor } from './__utils__/getLintStagedExecutor.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'reads config from stdin',
    withGitIntegration(async ({ cwd, execGit, readFile, writeFile }) => {
      const lintStaged = getLintStagedExecutor(cwd)

      // Stage ugly file
      await writeFile('test file.js', fileFixtures.uglyJS)
      await execGit(['add', 'test file.js'])

      // Run lint-staged with config from stdin
      const subprocess = lintStaged(['-c', '-'])

      const childProcess = await subprocess.nodeChildProcess
      childProcess.stdin.write(JSON.stringify(configFixtures.prettierWrite))
      childProcess.stdin.end()

      await subprocess

      // Nothing was wrong so file was prettified
      expect(await readFile('test file.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'fails when stdin config is not valid',
    withGitIntegration(async ({ cwd, execGit, readFile, writeFile }) => {
      const lintStaged = getLintStagedExecutor(cwd)

      // Stage ugly file
      await writeFile('test file.js', fileFixtures.uglyJS)
      await execGit(['add', 'test file.js'])

      // Break JSON by removing } from the end
      const brokenJSONConfig = JSON.stringify(configFixtures.prettierWrite).replace('"}', '"')

      // Run lint-staged with config from stdin
      const subprocess = lintStaged(['-c', '-'])

      const childProcess = await subprocess.nodeChildProcess
      childProcess.stdin.write(brokenJSONConfig)
      childProcess.stdin.end()

      // Run lint-staged with broken config from stdin
      await expect(subprocess).rejects.toMatchObject({
        stderr: expect.stringContaining('Failed to read config from stdin'),
      })

      // File was not edited
      expect(await readFile('test file.js')).toEqual(fileFixtures.uglyJS)
    })
  )
})
