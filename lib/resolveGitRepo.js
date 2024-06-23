import path from 'node:path'

import debug from 'debug'

import { execGit } from './execGit.js'
import { normalizePath } from './normalizePath.js'

const debugLog = debug('lint-staged:resolveGitRepo')

/**
 * Resolve .git directory relative to repo top-level directory
 *
 * @example ".git"
 */
const resolveRelativeGitDir = async (cwd = process.cwd()) => {
  /**
   * Absolute repo top-level directory
   *
   * @example <caption>Git on macOS</caption>
   * "/Users/iiro/Documents/git/lint-staged"
   *
   * @example <caption>Git for Windows</caption>
   * "C:\Users\iiro\Documents\git\lint-staged"
   *
   * @example <caption>Git installed with MSYS2, this doesn't work when used as CWD with Node.js child_process</caption>
   * "/c/Users/iiro/Documents/git/lint-staged"
   */
  const topLevelPromise = execGit(['rev-parse', '--show-toplevel'], { cwd })

  /**
   * Absolute .git directory, similar to top-level
   *
   * @example "/Users/iiro/Documents/git/lint-staged/.git"
   */
  const absoluteGitDirPromise = execGit(['rev-parse', '--absolute-git-dir'], { cwd })

  const [topLevel, absoluteGitDir] = await Promise.all([topLevelPromise, absoluteGitDirPromise])

  return path.relative(topLevel, absoluteGitDir)
}

/** Resolve git directory and possible submodule paths */
export const resolveGitRepo = async (cwd = process.cwd()) => {
  try {
    debugLog('Resolving git repo from `%s`', cwd)

    // Unset GIT_DIR before running any git operations in case it's pointing to an incorrect location
    debugLog('Unset GIT_DIR (was `%s`)', process.env.GIT_DIR)
    delete process.env.GIT_DIR
    debugLog('Unset GIT_WORK_TREE (was `%s`)', process.env.GIT_WORK_TREE)
    delete process.env.GIT_WORK_TREE

    const relativeTopLevelDir = await execGit(['rev-parse', '--show-cdup'], { cwd })
    const topLevelDir = normalizePath(path.join(cwd, relativeTopLevelDir))
    debugLog('Resolved git repository top-level directory to be `%s`', topLevelDir)

    const relativeGitConfigDir = await resolveRelativeGitDir(cwd)
    const gitConfigDir = normalizePath(path.join(topLevelDir, relativeGitConfigDir))
    debugLog('Resolved git config directory to be `%s`', gitConfigDir)

    return { topLevelDir, gitConfigDir }
  } catch (error) {
    debugLog('Failed to resolve git repo with error:', error)
    return { error, topLevelDir: null, gitConfigDir: null }
  }
}
