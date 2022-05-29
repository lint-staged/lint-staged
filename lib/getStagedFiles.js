import fs from 'fs'
import path from 'path'

import normalize from 'normalize-path'

import { execGit } from './execGit.js'
import { parseGitZOutput } from './parseGitZOutput.js'

export const getStagedFiles = async ({ cwd = process.cwd() } = {}) => {
  try {
    let files = []
    const dotFilePath = path.resolve(cwd, '.git-staged-files')
    if (fs.existsSync(dotFilePath)) {
      files = fs.readFileSync(dotFilePath, 'utf8').toString().trim().split('\n')
    } else {
      // Docs for --diff-filter option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt---diff-filterACDMRTUXB82308203
      // Docs for -z option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt--z
      const lines = await execGit(['diff', '--staged', '--diff-filter=ACMR', '--name-only', '-z'], {
        cwd,
      })
      files = parseGitZOutput(lines)
    }
    if (!files) return []

    return files.map((file) => normalize(path.resolve(cwd, file)))
  } catch {
    return null
  }
}
