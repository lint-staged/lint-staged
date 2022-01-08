import { jest } from '@jest/globals'

import { withGitIntegration } from './utils/gitIntegration.js'
import * as fileFixtures from './fixtures/files.js'
import * as configFixtures from './fixtures/configs.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('integration', () => {
  test(
    'skips backup and revert with --no-stash',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      // Stage pretty file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with --no-stash
      const stdout = await gitCommit({ lintStaged: ['--no-stash'] })

      expect(stdout).toMatch('Skipping backup because `--no-stash` was used')

      // Nothing is wrong, so a new commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS)
    })
  )

  test(
    'aborts commit without reverting with --no-stash 1',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      // Run lint-staged with action that does horrible things to the file, causing a merge conflict
      await writeFile(
        '.lintstagedrc.js',
        `
        const fs = require('fs')
        const path = require('path')
        module.exports = {
          '*.js': () => {
            const testFile = path.join(__dirname, 'test.js')
            fs.writeFileSync(testFile, Buffer.from(\`${fileFixtures.invalidJS}\`, 'binary'))
            return \`prettier --write \${testFile}\`
          }
        }`
      )

      // Stage file
      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      await expect(gitCommit({ lintStaged: ['--no-stash'] })).rejects.toThrowError(
        'Unstaged changes could not be restored due to a merge conflict'
      )

      // Something was wrong so the commit was aborted
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await execGit(['status', '--porcelain'])).toMatchInlineSnapshot(`
        "UU test.js
        ?? .lintstagedrc.js"
      `)

      // Without revert, the merge conflict is left in-place
      expect(await readFile('test.js')).toMatchInlineSnapshot(`
        "<<<<<<< ours
        module.exports = {
          foo: \\"bar\\",
        };
        =======
        const obj = {
            'foo': 'bar'
        >>>>>>> theirs
        "
      `)
    })
  )

  test(
    'aborts commit without reverting with --no-stash 2',
    withGitIntegration(async ({ execGit, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierWrite))

      await writeFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])
      await writeFile('test2.js', fileFixtures.invalidJS)
      await execGit(['add', 'test2.js'])

      // Run lint-staged with --no-stash
      await expect(gitCommit({ lintStaged: ['--no-stash'] })).rejects.toThrowError(
        'SyntaxError: Unexpected token'
      )

      // Something was wrong, so the commit was aborted
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')
      expect(await readFile('test.js')).toEqual(fileFixtures.prettyJS) // file was still fixed
      expect(await readFile('test2.js')).toEqual(fileFixtures.invalidJS)
    })
  )
})
