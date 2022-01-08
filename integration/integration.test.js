import path from 'path'

import { jest } from '@jest/globals'
import fs from 'fs-extra'

import { addConfigFileSerializer } from './utils/configFilepathSerializer.js'
import { withGitIntegration } from './utils/gitIntegration.js'
import * as fileFixtures from './fixtures/files.js'
import * as configFixtures from './fixtures/configs.js'

jest.setTimeout(20000)
jest.retryTimes(2)

addConfigFileSerializer()

describe('integration', () => {
  test(
    'commits entire staged file when no errors from linter',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage pretty file
      await writeFile('test file.js', fileFixtures.prettyJS)
      await execGit(['add', 'test file.js'])

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit()

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test file.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'commits entire staged file when no errors and linter modifies file',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage multiple ugly files
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      await writeFile('test2.js', fileFixtures.uglyJS)
      await execGit(['add', 'test2.js'])

      // Run lint-staged with `prettier --write` and commit pretty file
      await gitCommit()

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('test2.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'fails to commit entire staged file when errors from linter',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage ugly file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      const status = await execGit(['status'])

      // Run lint-staged with `prettier --list-different` to break the linter
      await expect(gitCommit()).rejects.toThrowError(
        'Reverting to original state because of errors'
      )

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)
    })
  )

  test(
    'fails to commit entire staged file when errors from linter and linter modifies files',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Add unfixable file to commit so `prettier --write` breaks
      await writeFile('test.js', fileFixtures.invalidJS)
      await execGit(['add', 'test.js'])
      const status = await execGit(['status'])

      // Run lint-staged with `prettier --write` to break the linter
      await expect(gitCommit()).rejects.toThrowError(
        'Reverting to original state because of errors'
      )

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test.js')).toEqual(fileFixtures.invalidJS)
    })
  )

  test(
    'clears unstaged changes when linter applies same changes',
    withGitIntegration(async ({ appendFile, cwd, execGit, gitCommit, readFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Replace ugly file with pretty but do not stage changes
      await fs.remove(path.join(cwd, 'test.js'))
      await appendFile('test.js', fileFixtures.prettyJS)

      // Run lint-staged with `prettier --write` and commit pretty file
      await gitCommit()

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

      // Latest commit contains pretty file
      // `git show` strips empty line from here here
      expect(await execGit(['show', 'HEAD:test.js'])).toEqual(fileFixtures.prettyJS.trim())

      // Nothing is staged
      expect(await execGit(['status'])).toMatch('nothing added to commit')

      // File is pretty, and has been edited
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'runs chunked tasks when necessary',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage two files
      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])
      await writeFile('test2.js', fileFixtures.prettyJS)
      await execGit(['add', 'test2.js'])

      // Run lint-staged with `prettier --list-different` and commit pretty file
      // Set maxArgLength low enough so that chunking is used
      await gitCommit({ lintStaged: ['--max-arg-length', '10'] })

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('test2.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'fails when backup stash is missing',
    withGitIntegration(async ({ execGit, gitCommit, writeFile }) => {
      // Remove backup stash during run
      await writeFile(
        '.lintstagedrc.cjs',
        `module.exports = {
          '*.js': () => 'git stash drop'
        }`
      )

      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      await expect(gitCommit()).rejects.toThrowError('lint-staged automatic backup is missing')
    })
  )

  test(
    'handles files that begin with dash',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      await writeFile('--looks-like-flag.js', fileFixtures.uglyJS)
      await execGit(['add', '--', '--looks-like-flag.js'])

      await gitCommit()

      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await readFile('--looks-like-flag.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'works when a branch named stash exists',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // create a new branch called stash
      await execGit(['branch', 'stash'])

      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with `prettier --write` and commit pretty file
      await gitCommit()

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )
})
