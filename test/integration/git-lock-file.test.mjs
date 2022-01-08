import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'
import fs from 'fs-extra'

import { addConfigFileSerializer } from './utils/configFilepathSerializer.mjs'
import { testWithGitIntegration } from './utils/gitIntegration.mjs'
import * as fileFixtures from './fixtures/files.mjs'

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

  testWithGitIntegration(
    'fails when linter creates a .git/index.lock',
    async ({ appendFile, cwd, execGit, gitCommit, readFile }) => {
      // Stage ugly file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Edit ugly file but do not stage changes
      const appended = '\n\nconsole.log("test");\n'
      await appendFile('test.js', appended)
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS + appended)
      const diff = await execGit(['diff'])

      // Run lint-staged with `prettier --write` and commit pretty file
      // The task creates a git lock file and runs `git add` to simulate failure
      await expect(
        gitCommit({
          config: {
            '*.js': (files) => [
              `touch ${cwd}/.git/index.lock`,
              `prettier --write ${files.join(' ')}`,
              `git add ${files.join(' ')}`,
            ],
          },
        })
      ).rejects.toThrowError()

      const output = console.printHistory()
      expect(output).toMatch('Another git process seems to be running in this repository')

      // Something was wrong so new commit wasn't created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')

      // But local modifications are gone
      expect(await execGit(['diff'])).not.toEqual(diff)
      expect(await execGit(['diff'])).toMatchInlineSnapshot(`
              "diff --git a/test.js b/test.js
              index 1eff6a0..8baadc8 100644
              --- a/test.js
              +++ b/test.js
              @@ -1,3 +1,3 @@
               module.exports = {
              -    'foo': 'bar'
              -}
              +  foo: \\"bar\\",
              +};"
          `)

      expect(await readFile('test.js')).not.toEqual(fileFixtures.uglyJS + appended)
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)

      // Remove lock file
      await fs.remove(`${cwd}/.git/index.lock`)

      // Luckily there is a stash
      expect(await execGit(['stash', 'list'])).toMatchInlineSnapshot(
        `"stash@{0}: lint-staged automatic backup"`
      )
      await execGit(['reset', '--hard'])
      await execGit(['stash', 'pop', '--index'])

      expect(await execGit(['diff'])).toEqual(diff)
      expect(await readFile('test.js')).toEqual(fileFixtures.uglyJS + appended)
    }
  )
})
