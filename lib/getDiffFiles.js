'use strict'

const execGit = require('./execGit')

module.exports = async function getDiffFiles(commit, options) {
  try {
    // Docs for --diff-filter option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt---diff-filterACDMRTUXB82308203
    // Docs for -z option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt--z
    const lines = await execGit(
      ['diff', '--diff-filter=ACMR', '--name-only', '-z', commit + '...'],
      options
    )
    // With `-z`, git prints `fileA\u0000fileB\u0000fileC\u0000` so we need to remove the last occurrence of `\u0000` before splitting
    // eslint-disable-next-line no-control-regex
    return lines ? lines.replace(/\u0000$/, '').split('\u0000') : []
  } catch {
    return null
  }
}
