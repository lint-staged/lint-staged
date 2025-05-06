import fs from 'node:fs/promises'
import path from 'node:path'

import { jest } from '@jest/globals'

import { prettyJS } from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'handles git submodules',
    withGitIntegration(async ({ appendFile, cwd, execGit, gitCommit, readFile, removeFile }) => {
      await appendFile('.lintstagedrc.json', JSON.stringify({ '*': 'prettier --list-different' }))
      await execGit(['add', '.'])
      await execGit(['commit', '-m initial commit'])

      // create a new repo for the git submodule to a temp path
      let submoduleDir = path.resolve(cwd, 'submodule-temp')
      await fs.mkdir(submoduleDir, { recursive: true })
      await execGit('init', { cwd: submoduleDir })
      await execGit(['config', 'user.name', '"test"'], { cwd: submoduleDir })
      await execGit(['config', 'user.email', '"test@test.com"'], { cwd: submoduleDir })
      await appendFile('README.md', '# Test\n', submoduleDir)
      await execGit(['add', '.'], { cwd: submoduleDir })
      await execGit(['commit', '-m initial commit'], { cwd: submoduleDir })

      // Add the newly-created repo as a submodule in a new path.
      // This simulates adding it from a remote. By default file protocol is not allowed,
      // see https://git-scm.com/docs/git-config#Documentation/git-config.txt-protocolallow
      await execGit([
        '-c',
        'protocol.file.allow=always',
        'submodule',
        'add',
        '--force',
        './submodule-temp',
        './submodule',
      ])

      // remove temp path after adding submodule
      await removeFile(submoduleDir)

      submoduleDir = path.resolve(cwd, 'submodule')

      // Set these again for Windows git in CI
      await execGit(['config', 'user.name', '"test"'], { cwd: submoduleDir })
      await execGit(['config', 'user.email', '"test@test.com"'], { cwd: submoduleDir })

      // commit .gitmodules
      await execGit(['add', '.gitmodules'])
      await gitCommit()

      // Stage pretty file
      await appendFile('test.js', prettyJS, submoduleDir)
      await execGit(['add', 'test.js'], { cwd: submoduleDir })

      // Run lint-staged with `prettier --list-different` and commit pretty file
      await gitCommit(undefined, submoduleDir)

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'], { cwd: submoduleDir })).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'], { cwd: submoduleDir })).toMatch('test')
      expect(await readFile('test.js', submoduleDir)).toEqual(prettyJS)

      expect(await execGit(['status'])).toMatch('modified:   submodule (new commits)')
      await execGit(['add', '-u'])

      // there are no other unstaged or untracked changes
      expect(await execGit(['diff', '--name-only'])).toEqual('')
      expect(await execGit(['ls-files', '--others'])).toEqual('')

      // commit changes to submodule
      await gitCommit()
    })
  )
})
