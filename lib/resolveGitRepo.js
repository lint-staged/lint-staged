import fs from 'node:fs/promises'
import path from 'node:path'

import debug from 'debug'

import { execGit } from './execGit.js'
import { readFile } from './file.js'
import { normalizePath } from './normalizePath.js'

const debugLog = debug('lint-staged:resolveGitRepo')

/**
 * Resolve path to the .git directory, with special handling for
 * submodules and worktrees
 */
const resolveGitConfigDir = async (gitDir) => {
  // Get the real path in case it's a symlink
  const defaultDir = path.join(gitDir, '.git')
  const stats = await fs.lstat(defaultDir)

  // If .git is a directory, use it
  if (stats.isDirectory()) {
    return defaultDir
  }

  // If .git is a symlink, return the real location
  if (stats.isSymbolicLink()) {
    return await fs.realpath(gitDir)
  }

  // Otherwise .git is a file containing path to real location
  const file = (await readFile(defaultDir)).toString()
  return path.resolve(gitDir, file.replace(/^gitdir: /, '')).trim()
}

/**
 * Resolve git directory and possible submodule paths
 */
export const resolveGitRepo = async (cwd = process.cwd()) => {
  try {
    debugLog('Resolving git repo from `%s`', cwd)

    // Unset GIT_DIR before running any git operations in case it's pointing to an incorrect location
    debugLog('Unset GIT_DIR (was `%s`)', process.env.GIT_DIR)
    delete process.env.GIT_DIR
    debugLog('Unset GIT_WORK_TREE (was `%s`)', process.env.GIT_WORK_TREE)
    delete process.env.GIT_WORK_TREE

    const gitDir = normalizePath(
      await execGit(['rev-parse', '--path-format=absolute', '--show-toplevel'], { cwd })
    )
    const gitConfigDir = normalizePath(await resolveGitConfigDir(gitDir))

    debugLog('Resolved git directory to be `%s`', gitDir)
    debugLog('Resolved git config directory to be `%s`', gitConfigDir)

    return { gitDir, gitConfigDir }
  } catch (error) {
    debugLog('Failed to resolve git repo with error:', error)
    return { error, gitDir: null, gitConfigDir: null }
  }
}
