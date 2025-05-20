import fs from 'node:fs/promises'
import path from 'node:path'

import { expect, jest } from '@jest/globals'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'ignores symlinked staged files',
    withGitIntegration(async ({ appendFile, cwd, execGit, gitCommit, readFile }) => {
      await appendFile('test.js', fileFixtures.uglyJS)
      await appendFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      await execGit(['add', '.'])

      /** lint-staged fails to ugly staged file */
      await expect(gitCommit()).rejects.toThrow('prettier --list-different')

      await execGit(['commit', '-m "commit without lint-staged"'])

      await fs.symlink(path.join(cwd, 'test.js'), path.join(cwd, 'test_2.js'))

      /** stage symlink to ugly file*/
      await execGit(['add', '.'])
      expect(await execGit(['status'])).toMatch('new file:   test_2.js')
      expect(await readFile('test_2.js')).toEqual(fileFixtures.uglyJS)

      const result = await gitCommit()

      /** lint-staged ignored symlink */
      expect(result).toMatch('No staged files found')
    })
  )
})
