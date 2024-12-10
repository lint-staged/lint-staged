import path from 'node:path'

import { execGit } from './execGit.js'
import { getDiffCommand } from './getDiffCommand.js'
import { normalizePath } from './normalizePath.js'
import { parseGitZOutput } from './parseGitZOutput.js'

const listSubmoduleRoots = async ({ cwd }) => {
  const lines = await execGit(['submodule', '--quiet', 'foreach', 'echo $displaypath'], { cwd })
  return lines.split('\n').map((file) => normalizePath(path.resolve(cwd, file)))
}

export const getStagedFiles = async ({ cwd = process.cwd(), diff, diffFilter } = {}) => {
  try {
    const lines = await execGit(getDiffCommand(diff, diffFilter), { cwd })
    if (!lines) return []

    const submodules = await listSubmoduleRoots({ cwd })

    return parseGitZOutput(lines)
      .map((file) => normalizePath(path.resolve(cwd, file)))
      .filter((file) => !submodules.includes(file))
  } catch {
    return null
  }
}
