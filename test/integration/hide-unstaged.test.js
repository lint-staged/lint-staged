import { describe, test } from 'vitest'

import * as configFixtures from './__fixtures__/configs.js'
import * as fileFixtures from './__fixtures__/files.js'
import { withGitIntegration } from './__utils__/withGitIntegration.js'

describe('lint-staged', () => {
  test(
    'should hide unstaged changes with --hide-unstaged flag',
    withGitIntegration(async ({ execGit, expect, gitCommit, readFile, writeFile }) => {
      await writeFile('.lintstagedrc.json', JSON.stringify(configFixtures.prettierListDifferent))

      // Stage pretty files
      await writeFile('pretty.js', fileFixtures.prettyJS)
      await execGit(['add', 'pretty.js'])
      await writeFile('pretty_2.js', fileFixtures.prettyJS)
      await execGit(['add', 'pretty_2.js'])

      await gitCommit({ lintStaged: { hideUnstaged: true } })

      // Mess up pretty file but do not stage changes
      await writeFile('pretty.js', fileFixtures.uglyJS)

      // Edit second file keeping it pretty and stage changes
      await writeFile('pretty_2.js', fileFixtures.prettyJSWithChanges)
      await execGit(['add', 'pretty_2.js'])

      // Finally, make "partially staged" ugly changes to second file
      await writeFile('pretty_2.js', fileFixtures.uglyJS)

      await gitCommit({ lintStaged: { hideUnstaged: true } })

      // Both files are still ugly in working tree because unstaged changes were restored
      const gitStatus = await execGit(['status', '-z'])
      expect(gitStatus).toMatch(' M pretty.js')
      expect(await readFile('pretty.js')).toEqual(fileFixtures.uglyJS)
      expect(gitStatus).toMatch(' M pretty_2.js')
      expect(await readFile('pretty_2.js')).toEqual(fileFixtures.uglyJS)
    })
  )
})
