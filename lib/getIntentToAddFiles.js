import path from 'node:path'

import { createDebug } from './debug.js'
import { execGit } from './execGit.js'
import { normalizePath } from './normalizePath.js'
import { parseGitZOutput } from './parseGitZOutput.js'

const debugLog = createDebug('lint-staged:getIntentToAddFiles')

export const getIntentToAddFiles = async ({ cwd }) => {
  const [stagedWithIta, stagedWithoutIta] = await Promise.all([
    execGit(['diff', '--staged', '--ita-visible-in-index', '--name-only', '-z'], { cwd }).then(
      parseGitZOutput
    ),
    execGit(['diff', '--staged', '--ita-invisible-in-index', '--name-only', '-z'], { cwd }).then(
      parseGitZOutput
    ),
  ])

  const set = new Set(stagedWithoutIta)

  const intentToAdd = stagedWithIta
    .filter((f) => !set.has(f))
    .map((f) => normalizePath(path.join(cwd, f)))

  debugLog(`Detected ${intentToAdd.length} files staged with "--intent-to-add":`, intentToAdd)

  return intentToAdd
}
