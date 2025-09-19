import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, test } from 'vitest'

import { prettierWrite } from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'works with symlinked config file',
    withGitIntegration(async ({ appendFile, cwd, execGit, expect, gitCommit, readFile }) => {
      await appendFile('test.js', fileFixtures.uglyJS)

      await appendFile('.config/.lintstagedrc.json', JSON.stringify(prettierWrite))
      await fs.symlink(
        path.join(cwd, '.config/.lintstagedrc.json'),
        path.join(cwd, '.lintstagedrc.json')
      )

      await execGit(['add', '.'])

      await gitCommit()

      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS) // file was fixed
    })
  )
})
