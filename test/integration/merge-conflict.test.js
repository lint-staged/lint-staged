import fs from 'node:fs'
import path from 'node:path'

import { jest } from '@jest/globals'

import { prettierListDifferent, prettierWrite } from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

jest.setTimeout(20000)
jest.retryTimes(2)

describe('lint-staged', () => {
  test(
    'handles merge conflicts',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile, writeFile }) => {
      const fileInBranchA = `module.exports = "foo";\n`
      const fileInBranchB = `module.exports = 'bar'\n`
      const fileInBranchBFixed = `module.exports = "bar";\n`

      // Create one branch
      await execGit(['checkout', '-b', 'branch-a'])
      await appendFile('test.js', fileInBranchA)
      await appendFile('.lintstagedrc.json', JSON.stringify(prettierWrite))
      await execGit(['add', '.'])

      await gitCommit({ gitCommit: ['-m commit a'] })

      expect(await readFile('test.js')).toEqual(fileInBranchA)

      await execGit(['checkout', 'master'])

      // Create another branch
      await execGit(['checkout', '-b', 'branch-b'])
      await appendFile('test.js', fileInBranchB)
      await appendFile('.lintstagedrc.json', JSON.stringify(prettierWrite))
      await execGit(['add', '.'])
      await gitCommit({ gitCommit: ['-m commit b'] })
      expect(await readFile('test.js')).toEqual(fileInBranchBFixed)

      // Merge first branch
      await execGit(['checkout', 'master'])
      await execGit(['merge', 'branch-a'])
      expect(await readFile('test.js')).toEqual(fileInBranchA)
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('commit a')

      // Merge second branch, causing merge conflict
      await expect(execGit(['merge', 'branch-b'])).rejects.toThrow('Merge conflict in test.js')

      expect(await readFile('test.js')).toMatchInlineSnapshot(`
        "<<<<<<< HEAD
        module.exports = "foo";
        =======
        module.exports = "bar";
        >>>>>>> branch-b
        "
      `)

      // Fix conflict and commit using lint-staged
      await writeFile('test.js', fileInBranchB)
      expect(await readFile('test.js')).toEqual(fileInBranchB)
      await execGit(['add', '.'])

      await gitCommit({ gitCommit: ['--no-edit'] })

      // Nothing is wrong, so a new commit is created and file is pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('4')
      const log = await execGit(['log', '-1', '--pretty=%B'])
      expect(log).toMatch(`Merge branch 'branch-b`)
      expect(log).toMatch(`Conflicts:`)
      expect(log).toMatch(`test.js`)
      expect(await readFile('test.js')).toEqual(fileInBranchBFixed)
    })
  )

  test(
    'handles merge conflict when task errors',
    withGitIntegration(async ({ appendFile, execGit, gitCommit, readFile, writeFile }) => {
      const fileInBranchA = `module.exports = "foo";\n`
      const fileInBranchB = `module.exports = 'bar'\n`
      const fileInBranchBFixed = `module.exports = "bar";\n`

      // Create one branch
      await execGit(['checkout', '-b', 'branch-a'])
      await appendFile('test.js', fileInBranchA)
      await writeFile('.lintstagedrc.json', JSON.stringify(prettierWrite))
      await execGit(['add', '.'])

      await gitCommit({ gitCommit: ['-m commit a'] })

      expect(await readFile('test.js')).toEqual(fileInBranchA)

      await execGit(['checkout', 'master'])

      // Create another branch
      await execGit(['checkout', '-b', 'branch-b'])
      await writeFile('.lintstagedrc.json', JSON.stringify(prettierWrite))
      await appendFile('test.js', fileInBranchB)
      await execGit(['add', '.'])

      await gitCommit({ gitCommit: ['-m commit b'] })

      expect(await readFile('test.js')).toEqual(fileInBranchBFixed)

      // Merge first branch
      await execGit(['checkout', 'master'])
      await execGit(['merge', 'branch-a'])
      expect(await readFile('test.js')).toEqual(fileInBranchA)
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('commit a')

      // Merge second branch, causing merge conflict
      await expect(execGit(['merge', 'branch-b'])).rejects.toThrow('Merge conflict in test.js')

      expect(await readFile('test.js')).toMatchInlineSnapshot(`
        "<<<<<<< HEAD
        module.exports = "foo";
        =======
        module.exports = "bar";
        >>>>>>> branch-b
        "
      `)

      // Fix conflict and commit using lint-staged
      await writeFile('test.js', fileInBranchB)
      expect(await readFile('test.js')).toEqual(fileInBranchB)
      await execGit(['add', '.'])

      await writeFile('.lintstagedrc.json', JSON.stringify(prettierListDifferent))

      await expect(gitCommit()).rejects.toThrow('Reverting to original state because of errors')

      // Something went wrong, so lintStaged failed and merge is still going
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['status'])).toMatch('All conflicts fixed but you are still merging')
      expect(await readFile('test.js')).toEqual(fileInBranchB)
    })
  )

  test(
    'fails to commit entire staged file when there are unrecoverable merge conflicts',
    withGitIntegration(async ({ appendFile, cwd, execGit, gitCommit }) => {
      // Stage file
      await appendFile('test.js', fileFixtures.uglyJS)
      await execGit(['add', 'test.js'])

      // Run lint-staged with action that does horrible things to the file, causing a merge conflict
      await expect(
        gitCommit({
          lintStaged: {
            config: {
              '*.js': async () => {
                const testFile = path.join(cwd, 'test.js')
                fs.writeFileSync(testFile, Buffer.from(fileFixtures.invalidJS, 'binary'))
                return `prettier --write ${testFile}`
              },
            },
          },
        })
      ).rejects.toThrow('Unstaged changes could not be restored due to a merge conflict!')

      // Something was wrong so the repo is returned to original state
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('initial commit')

      expect(await execGit(['status', '--porcelain'])).toMatchInlineSnapshot(`"AM test.js"`)
    })
  )
})
