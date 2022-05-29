import path from 'path'

import normalize from 'normalize-path'

import { execGit } from './execGit.js'
import { parseGitZOutput } from './parseGitZOutput.js'

export const getStagedFiles = async ({ cwd = process.cwd(), diff, diffFilter } = {}) => {
  try {
    /**
     *  Docs for --diff-filter option:
     * @see https://git-scm.com/docs/git-diff#Documentation/git-diff.txt---diff-filterACDMRTUXB82308203
     */
    const diffFilterArg = diffFilter !== undefined ? diffFilter.trim() : 'ACMR'

    /** Use `--diff branch1...branch2` or `--diff="branch1 branch2", or fall back to default staged files */
    const diffArgs = diff !== undefined ? diff.trim().split(' ') : ['--staged']

    /**
     * Docs for -z option:
     * @see https://git-scm.com/docs/git-diff#Documentation/git-diff.txt--z
     */
    const lines = await execGit(
      ['diff', '--name-only', '-z', `--diff-filter=${diffFilterArg}`, ...diffArgs],
      { cwd }
    )
    if (!lines) return []

    return parseGitZOutput(lines).map((file) => normalize(path.resolve(cwd, file)))
  } catch {
    return null
  }
}
