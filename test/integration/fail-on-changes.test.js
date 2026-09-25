import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, test } from 'vitest'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'should fail when tasks modify files and --fail-on-changes is used',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.oxfmtWrite))

      // Stage ugly files
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      expect.assertions(3)

      try {
        // Run lint-staged with `oxfmt --write` so that it modifies files
        await gitCommit({
          lintStaged: {
            failOnChanges: true,
          },
        })
      } catch (error) {
        expect(error.message).toMatch('lint-staged failed because `--fail-on-changes` was used')
        expect(error.message).toMatch('Skipped cleaning up temporary files…')
      }

      // Changes weren't reverted because "--no-revert" is implied
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'should fail when a task edits an unstaged symlink replacement and --fail-on-changes is used',
    withGitIntegration(
      async ({ cwd, execGit, expect, gitCommit, readFile, removeFile, writeFile }) => {
        await execGit(['config', '--local', 'core.symlinks', 'true'])

        await writeFile('target.js', fileFixtures.prettyJS)
        await fs.symlink('target.js', path.join(cwd, 'test.js'))
        await execGit(['add', 'target.js', 'test.js'])
        await execGit(['commit', '-m', 'commit symlink'])

        // Leave the type change unstaged so it is present in the snapshot before tasks.
        await removeFile('test.js')
        await writeFile('test.js', fileFixtures.uglyJS)

        // Stage only the config; the task explicitly formats all files.
        await writeFile('lint-staged.config.mjs', 'export default () => "oxfmt --write test.js"')
        await execGit(['add', 'lint-staged.config.mjs'])
        expect(await execGit(['diff', '--name-only'])).toEqual('test.js')
        expect(await execGit(['diff', '--cached', '--name-only'])).toEqual('lint-staged.config.mjs')

        await expect(
          gitCommit({
            lintStaged: {
              failOnChanges: true,
            },
          })
        ).rejects.toThrow('lint-staged failed because `--fail-on-changes` was used')

        expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
        expect(await execGit(['show', ':test.js'])).toEqual('target.js')
        expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      }
    )
  )

  test(
    'should not fail when --fail-on-changes is used but tasks do not modify files',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.oxfmtWrite))

      // Stage pretty files
      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with `oxfmt --write` so that it modifies files
      await gitCommit({
        lintStaged: {
          failOnChanges: true,
          quiet: true,
        },
      })

      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'should not fail with partially staged changes when --fail-on-changes is used but tasks do not modify files',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.oxfmtWrite))

      // Stage pretty files
      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Edit file to ugly but keep unstaged
      await writeFile('test.js', fileFixtures.uglyJS)

      // Run lint-staged with `oxfmt --write` so that it modifies files
      await gitCommit({
        lintStaged: {
          failOnChanges: true,
          quiet: true,
        },
      })

      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')

      // Partially staged changes were restored
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)
    })
  )
  test(
    'should not fail with unstaged staged changes when --fail-on-changes is used but tasks do not modify files',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.oxfmtWrite))

      // Stage pretty files
      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', 'test.js'])

      // Add second ugly file but keep unstaged
      await writeFile('test2.js', fileFixtures.uglyJS)

      // Run lint-staged with `oxfmt --write` so that it modifies files
      await gitCommit({
        lintStaged: {
          failOnChanges: true,
          hideUnstaged: true,
          quiet: true,
        },
      })

      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')

      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
      // Partially staged changes were restored
      expect(await readFile('test2.js')).toEqual(fileFixtures.uglyJS)
    })
  )

  test(
    'should fail and revert when both --fail-on-changes and --revert are used',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.oxfmtWrite))

      // Stage ugly files
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with `oxfmt --write` so that it modifies files
      await expect(() =>
        gitCommit({
          lintStaged: {
            failOnChanges: true,
            revert: true,
          },
        })
      ).rejects.toThrow('lint-staged failed because `--fail-on-changes` was used')

      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)
    })
  )
})
