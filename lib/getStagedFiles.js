import path from 'node:path'

import normalize from 'normalize-path'

import { execGit } from './execGit.js'
import { getDiffCommand } from './getDiffCommand.js'
import { parseGitZOutput } from './parseGitZOutput.js'

export const getStagedFiles = async ({ cwd = process.cwd(), diff, diffFilter } = {}) => {
  try {
    const lines = await execGit(getDiffCommand(diff, diffFilter), { cwd })
    if (!lines) return []

    return parseGitZOutput(lines).map((file) => normalize(path.resolve(cwd, file)))
  } catch {
    return null
  }
}
