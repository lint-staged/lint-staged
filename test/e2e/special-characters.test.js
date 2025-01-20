import path from 'node:path'

import { getRepoRootPath } from '../__utils__/getRepoRootPath.js'
import * as fileFixtures from '../integration/__fixtures__/files.js'
import { withGitIntegration } from '../integration/__utils__/withGitIntegration.js'
import { getLintStagedExecutor } from './__utils__/getLintStagedExecutor.js'

describe('lint-staged', () => {
  const REPO_ESLINT_CONFIG = path.join(getRepoRootPath(), '.eslintrc.json')

  const BASIC_CONFIG = {
    '*.js': [`eslint --config ${REPO_ESLINT_CONFIG} --fix`, 'prettier --write'],
  }

  test.each([['$test.js'], ['[test].js'], ['(test).js']])(
    'supports running "%s" with ESLint + Prettier',
    async (filename) =>
      withGitIntegration(async ({ cwd, execGit, readFile, writeFile }) => {
        const lintStaged = getLintStagedExecutor(cwd)

        await writeFile('.lintstagedrc.json', JSON.stringify(BASIC_CONFIG))

        await writeFile(filename, fileFixtures.uglyJS)
        await execGit(['add', filename])

        const result = await lintStaged()

        expect(result.exitCode).toEqual(0)

        expect(await readFile(filename)).toEqual(fileFixtures.prettyJS)
      })
  )
})
