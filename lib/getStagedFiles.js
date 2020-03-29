'use strict'

const execGit = require('./execGit')

module.exports = async function getStagedFiles(options) {
  try {
    // Docs for --diff-filter option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt---diff-filterACDMRTUXB82308203
    // Docs for -z option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt--z
    const lines = await execGit(
      ['diff', '--staged', '--diff-filter=ACMR', '--name-only', '-z'],
      options
    )
    // eslint-disable-next-line no-control-regex
    return lines ? lines.replace(/\u0000$/, '').split('\u0000') : []
  } catch {
    return null
  }
}
