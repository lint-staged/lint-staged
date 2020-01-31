'use strict'

const normalize = require('normalize-path')
const debugLog = require('debug')('lint-staged:resolveGitRepo')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const execGit = require('./execGit')
const { readFile } = require('./file')

const fsLstat = promisify(fs.lstat)

/**
 * Resolve path to the .git directory, with special handling for
 * submodules and worktrees
 */
const resolveGitConfigDir = async gitDir => {
  const defaultDir = path.resolve(gitDir, '.git')
  const stats = await fsLstat(defaultDir)
  // If .git is a directory, use it
  if (stats.isDirectory()) return defaultDir
  // Otherwise .git is a file containing path to real location
  const file = (await readFile(defaultDir)).toString()
  return path.resolve(gitDir, file.replace(/^gitdir: /, '')).trim()
}

/**
 * Resolve git directory and possible submodule paths
 */
const resolveGitRepo = async cwd => {
  try {
    debugLog('Resolving git repo from `%s`', cwd)
    // git cli uses GIT_DIR to fast track its response however it might be set to a different path
    // depending on where the caller initiated this from, hence clear GIT_DIR
    debugLog('Deleting GIT_DIR from env with value `%s`', process.env.GIT_DIR)
    delete process.env.GIT_DIR

    const gitDir = normalize(await execGit(['rev-parse', '--show-toplevel'], { cwd }))
    const gitConfigDir = normalize(await resolveGitConfigDir(gitDir))

    debugLog('Resolved git directory to be `%s`', gitDir)
    debugLog('Resolved git config directory to be `%s`', gitConfigDir)

    return { gitDir, gitConfigDir }
  } catch (error) {
    debugLog('Failed to resolve git repo with error:', error)
    return { error, gitDir: null, gitConfigDir: null }
  }
}

module.exports = resolveGitRepo
