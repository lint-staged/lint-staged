import { jest } from '@jest/globals'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'fails when task reverts staged changes without `--allow-empty`, to prevent an empty git commit',
    withGitIntegration(async ({ execGit, gitCommit, readFile, removeFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Create and commit a pretty file without running lint-staged
      // This way the file will be available for the next step
      await writeFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', '.'])
      await execGit(['commit', '-m committed pretty file'])

      // Edit file to be ugly
      await removeFile('test.js')
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with prettier --write to automatically fix the file
      // Since prettier reverts all changes, the commit should fail
      await expect(gitCommit()).rejects.toThrow('lint-staged prevented an empty git commit.')

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('committed pretty file')
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS)
    })
  )

  test(
    'creates commit when task reverts staged changed and --allow-empty is used',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Create and commit a pretty file without running lint-staged
      // This way the file will be available for the next step
      await appendFile('test.js', fileFixtures.prettyJS)
      await execGit(['add', '.'])
      await execGit(['commit', '-m committed pretty file'])

      // Edit file to be ugly
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with prettier --write to automatically fix the file
      // Here we also pass '--allow-empty' to gitCommit because this part is not the full lint-staged
      await gitCommit({ lintStaged: { allowEmpty: true }, gitCommit: ['-m test', '--allow-empty'] })

      // Nothing was wrong so the empty commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('3')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await execGit(['diff', '-1'])).toEqual('')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )
})
