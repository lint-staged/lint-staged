import { describe, test } from 'vitest'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'should hide all unstaged changes and untracked files with --hide-all option',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))
      await execGit(['add', '.lintstagedrc.json'])

      // Stage pretty files
      await writeFile('pretty.js', fileFixtures.prettyJS)
      await execGit(['add', 'pretty.js'])
      await writeFile('pretty_2.js', fileFixtures.prettyJS)
      await execGit(['add', 'pretty_2.js'])

      // Add untracked file
      await writeFile('ugly_untracked.js', fileFixtures.uglyJS)

      await gitCommit({ lintStaged: { hideAll: true } })

      // Untracked file is back
      expect(await readFile('ugly_untracked.js')).toBe(fileFixtures.uglyJS)

      // Mess up pretty file but do not stage changes
      await writeFile('pretty.js', fileFixtures.uglyJS)

      // Edit second file keeping it pretty and stage changes
      await writeFile('pretty_2.js', fileFixtures.prettyJSWithChanges)
      await execGit(['add', 'pretty_2.js'])

      // Finally, make "partially staged" ugly changes to second file
      await writeFile('pretty_2.js', fileFixtures.uglyJS)

      await gitCommit({ lintStaged: { hideAll: true } })

      // Untracked file is still back
      expect(await readFile('ugly_untracked.js')).toBe(fileFixtures.uglyJS)

      const gitStatus = await execGit(['status', '-z'])

      expect(gitStatus).toMatch(' M pretty.js')
      expect(await readFile('pretty.js')).toEqual(fileFixtures.uglyJS)
      expect(gitStatus).toMatch('?? ugly_untracked.js')
      expect(await readFile('ugly_untracked.js')).toEqual(fileFixtures.uglyJS)
      expect(gitStatus).toMatch(' M pretty_2.js')
      expect(await readFile('pretty_2.js')).toEqual(fileFixtures.uglyJS)
    })
  )

  test(
    'should work with --hide-all option even without untracked files',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))
      await execGit(['add', '.lintstagedrc.json'])

      // Stage pretty files
      await writeFile('pretty.js', fileFixtures.prettyJS)
      await execGit(['add', 'pretty.js'])
      await writeFile('pretty_2.js', fileFixtures.prettyJS)
      await execGit(['add', 'pretty_2.js'])

      await gitCommit({ lintStaged: { hideAll: true } })

      // Mess up pretty file but do not stage changes
      await writeFile('pretty.js', fileFixtures.uglyJS)

      // Edit second file keeping it pretty and stage changes
      await writeFile('pretty_2.js', fileFixtures.prettyJSWithChanges)
      await execGit(['add', 'pretty_2.js'])

      // Finally, make "partially staged" ugly changes to second file
      await writeFile('pretty_2.js', fileFixtures.uglyJS)

      await gitCommit({ lintStaged: { hideAll: true } })

      const gitStatus = await execGit(['status', '-z'])

      expect(gitStatus).toMatch(' M pretty.js')
      expect(await readFile('pretty.js')).toEqual(fileFixtures.uglyJS)
      expect(gitStatus).toMatch(' M pretty_2.js')
      expect(await readFile('pretty_2.js')).toEqual(fileFixtures.uglyJS)
    })
  )
})
