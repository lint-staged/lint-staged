import path from 'path'

import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'
import fs from 'fs-extra'

import lintStaged from '../../lib/index.mjs'

import { addConfigFileSerializer } from './utils/configFilepathSerializer.mjs'
import { testWithGitIntegration } from './utils/gitIntegration.mjs'
import * as fileFixtures from './fixtures/files.mjs'
import * as configFixtures from './fixtures/configs.mjs'

jest.setTimeout(20000)

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

  testWithGitIntegration('exits early with no staged files', async ({ cwd }) => {
    expect(() => lintStaged({ config: { '*.js': 'echo success' }, cwd })).resolves
  })

  testWithGitIntegration(
    'commits entire staged file when no errors from linter',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Stage pretty file
      await appendFile('test file.js', fileFixtures.prettyJS)
      await execGit(['add', 'test file.js'])

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit(configFixtures.prettierListDifferent)

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test file.js')).toEqual(fileFixtures.prettyJS)
    }
  )

  testWithGitIntegration(
    'commits entire staged file when no errors and linter modifies file',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Stage multiple ugly files
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      await appendFile('test2.js', fileFixtures.uglyJS)
      await execGit(['add', 'test2.js'])

      // Run lint-staged with `prettier --write` and commit pretty file
      await gitCommit(configFixtures.prettierWrite)

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('test2.js')).toEqual(fileFixtures.prettyJS)
    }
  )

  testWithGitIntegration(
    'fails to commit entire staged file when errors from linter',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Stage ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      const status = await execGit(['status'])

      // Run lint-staged with `prettier --list-different` to break the linter
      try {
        await gitCommit(configFixtures.prettierListDifferent)
      } catch (error) {
        expect(error.message).toMatchInlineSnapshot(`"lint-staged failed"`)
      }

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)
    }
  )

  testWithGitIntegration(
    'fails to commit entire staged file when errors from linter and linter modifies files',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Add unfixable file to commit so `prettier --write` breaks
      await appendFile('test.js', fileFixtures.invalidJS)
      await execGit(['add', 'test.js'])
      const status = await execGit(['status'])

      // Run lint-staged with `prettier --write` to break the linter
      try {
        await gitCommit(configFixtures.prettierWrite)
      } catch (error) {
        expect(error.message).toMatchInlineSnapshot(`"lint-staged failed"`)
      }

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status'])).toEqual(status)
      expect(await readFile('test.js')).toEqual(fileFixtures.invalidJS)
    }
  )

  testWithGitIntegration(
    'clears unstaged changes when linter applies same changes',
    async ({ appendFile, cwd, execGit, gitCommit, readFile }) => {
      // Stage ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Replace ugly file with pretty but do not stage changes
      await fs.remove(path.join(cwd, 'test.js'))
      await appendFile('test.js', fileFixtures.prettyJS)

      // Run lint-staged with `prettier --write` and commit pretty file
      await gitCommit(configFixtures.prettierWrite)

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')

      // Latest commit contains pretty file
      // `git show` strips empty line from here here
      expect(await execGit(['show', 'HEAD:test.js'])).toEqual(fileFixtures.prettyJS.trim())

      // Nothing is staged
      expect(await execGit(['status'])).toMatch('nothing to commit, working tree clean')

      // File is pretty, and has been edited
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    }
  )

  testWithGitIntegration(
    'runs chunked tasks when necessary',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // Stage two files
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])
      await appendFile('test2.js', fileFixtures.prettyJS)
      await execGit(['add', 'test2.js'])

      // Run lint-staged with `prettier --list-different` and commit pretty file
      // Set maxArgLength low enough so that chunking is used
      await gitCommit({ config: { '*.js': 'prettier --list-different' }, maxArgLength: 10 })

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('test2.js')).toEqual(fileFixtures.prettyJS)
    }
  )

  testWithGitIntegration(
    'fails when backup stash is missing',
    async ({ appendFile, execGit, gitCommit }) => {
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Remove backup stash during run
      await expect(
        gitCommit({ config: { '*.js': () => 'git stash drop' }, shell: true })
      ).rejects.toThrowError()

      expect(console.printHistory()).toMatchInlineSnapshot(`
        "
        LOG [STARTED] Preparing lint-staged...
        LOG [SUCCESS] Preparing lint-staged...
        LOG [STARTED] Running tasks for staged files...
        LOG [STARTED] <path>/<lint-staged.config.ext> — 1 file
        LOG [STARTED] *.js — 1 file
        LOG [STARTED] git stash drop
        LOG [SUCCESS] git stash drop
        LOG [SUCCESS] *.js — 1 file
        LOG [SUCCESS] <path>/<lint-staged.config.ext> — 1 file
        LOG [SUCCESS] Running tasks for staged files...
        LOG [STARTED] Applying modifications from tasks...
        LOG [SUCCESS] Applying modifications from tasks...
        LOG [STARTED] Cleaning up temporary files...
        ERROR [FAILED] lint-staged automatic backup is missing!"
      `)
    }
  )

  testWithGitIntegration(
    'handles files that begin with dash',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      await appendFile('--looks-like-flag.js', fileFixtures.uglyJS)
      await execGit(['add', '--', '--looks-like-flag.js'])
      await expect(gitCommit(configFixtures.prettierWrite)).resolves.toEqual(undefined)
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await readFile('--looks-like-flag.js')).toEqual(fileFixtures.prettyJS)
    }
  )

  testWithGitIntegration(
    'works when a branch named stash exists',
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      // create a new branch called stash
      await execGit(['branch', 'stash'])

      // Stage multiple ugly files
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      await appendFile('test2.js', fileFixtures.uglyJS)
      await execGit(['add', 'test2.js'])

      // Run lint-staged with `prettier --write` and commit pretty file
      await gitCommit(configFixtures.prettierWrite)

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('test2.js')).toEqual(fileFixtures.prettyJS)
    }
  )
})
