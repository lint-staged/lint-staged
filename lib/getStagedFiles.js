import path from 'path'

import normalize from 'normalize-path'

import { execGit } from './execGit.js'

export const getStagedFiles = async ({ cwd = process.cwd() } = {}) => {
  try {
    // Docs for --diff-filter option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt---diff-filterACDMRTUXB82308203
    // Docs for -z option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt--z
    const lines = await execGit(['diff', '--staged', '--diff-filter=ACMR', '--name-only', '-z'], {
      cwd,
    })

    if (!lines) return []

    // With `-z`, git prints `fileA\u0000fileB\u0000fileC\u0000` so we need to
    // remove the last occurrence of `\u0000` before splitting
    return (
      lines
        // eslint-disable-next-line no-control-regex
        .replace(/\u0000$/, '')
        .split('\u0000')
        .map((file) => normalize(path.resolve(cwd, file)))
    )
  } catch {
    return null
  }
}
