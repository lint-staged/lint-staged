import { fork } from 'node:child_process'

import { describe, test } from 'vitest'

import * as configFixtures from '../integration/__fixtures__/configs.js'
import * as fileFixtures from '../integration/__fixtures__/files.js'
import { withGitIntegration } from '../integration/__utils__/withGitIntegration.js'
import { lintStagedBin } from './__utils__/forkLintStagedBin.js'

describe('lint-staged', () => {
  test(
    'reads config from stdin',
    withGitIntegration(async ({ cwd, execGit, expect, readFile, writeFile }) => {
      // Stage ugly file
      await writeFile('test file.js', fileFixtures.uglyJS)
      await execGit(['add', 'test file.js'])

      // Run lint-staged with config from stdin
      const child = fork(lintStagedBin, ['-c', '-'], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      })

      child.stdin.write(JSON.stringify(configFixtures.prettierWrite))
      child.stdin.end()

      await new Promise((resolve, reject) => {
        child.on('close', resolve)
        child.on('error', reject)
      })

      // Nothing was wrong so file was prettified
      expect(await readFile('test file.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'fails when stdin config is not valid',
    withGitIntegration(async ({ cwd, execGit, expect, readFile, writeFile }) => {
      // Stage ugly file
      await writeFile('test file.js', fileFixtures.uglyJS)
      await execGit(['add', 'test file.js'])

      // Break JSON by removing } from the end
      const brokenJSONConfig = JSON.stringify(configFixtures.prettierWrite).replace('"}', '"')

      // Run lint-staged with config from stdin
      const child = fork(lintStagedBin, ['-c', '-'], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      })

      let stderr = ''
      child.stderr.on('data', (chunk) => (stderr += chunk))

      child.stdin.write(brokenJSONConfig)
      child.stdin.end()

      await new Promise((resolve, reject) => {
        child.on('close', resolve)
        child.on('error', reject)
      })

      expect(child.exitCode).toBe(1)
      expect(stderr).toMatch('Failed to read config from stdin')

      // File was not edited
      expect(await readFile('test file.js')).toEqual(fileFixtures.uglyJS)
    })
  )
})
