import debug from 'debug'

import { execGit } from './execGit.js'
import { normalizePath } from './normalizePath.js'

const debugLog = debug('lint-staged:resolveGitRepo')

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

    const gitDir = normalizePath(await execGit(['rev-parse', '--show-toplevel'], { cwd }))
    debugLog('Resolved git directory to be `%s`', gitDir)

    const gitConfigDir = normalizePath(await execGit(['rev-parse', '--absolute-git-dir'], { cwd }))
    debugLog('Resolved git config directory to be `%s`', gitConfigDir)

    return { gitDir, gitConfigDir }
  } catch (error) {
    debugLog('Failed to resolve git repo with error:', error)
    return { error, gitDir: null, gitConfigDir: null }
  }
}
