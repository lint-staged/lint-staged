import './__mocks__/resolveConfig.js'

import path from 'node:path'

import { jest } from '@jest/globals'
import fs from 'fs-extra'

import { withGitIntegration } from './__utils__/withGitIntegration.js'
import { prettierWrite } from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'works with symlinked config file',
    withGitIntegration(async ({ appendFile, cwd, execGit, gitCommit, readFile }) => {
      await appendFile('test.js', fileFixtures.uglyJS)

      await appendFile('.config/.lintstagedrc.json', JSON.stringify(prettierWrite))
      await fs.ensureSymlink(
        path.join(cwd, '.config/.lintstagedrc.json'),
        path.join(cwd, '.lintstagedrc.json')
      )

      await execGit(['add', '.'])

      await gitCommit()

      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS) // file was fixed
    })
  )
})
