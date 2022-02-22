import path from 'path'

import normalize from 'normalize-path'

import { execGit } from './execGit.js'
import { parseGitZOutput } from './parseGitZOutput.js'

export const getStagedFiles = async ({ cwd = process.cwd() } = {}) => {
  try {
    // Docs for --diff-filter option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt---diff-filterACDMRTUXB82308203
    // Docs for -z option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt--z
    const lines = await execGit(['diff', '--staged', '--diff-filter=ACMR', '--name-only', '-z'], {
      cwd,
    })

    if (!lines) return []

    return parseGitZOutput(lines).map((file) => normalize(path.resolve(cwd, file)))
  } catch {
    return null
  }
}
