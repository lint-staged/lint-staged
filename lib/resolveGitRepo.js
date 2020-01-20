'use strict'

const normalize = require('normalize-path')
const path = require('path')

const execGit = require('./execGit')
const { readBufferFromFile } = require('./file')

/**
 * Resolve path to the .git directory, with special handling for
 * submodules
 */
const resolveGitConfigDir = async ({ gitDir, isSubmodule }) => {
  const defaultDir = path.resolve(gitDir, '.git')
  if (!isSubmodule) return normalize(defaultDir)

  const buffer = await readBufferFromFile(defaultDir)
  const dotGit = buffer.toString()
  const gitConfigDir = path.resolve(gitDir, dotGit.replace(/^gitdir: /, '').trim())
  return normalize(gitConfigDir)
}

/**
 * Resolve git directory and possible submodule paths
 */
module.exports = async function resolveGitRepo(options = {}) {
  try {
    // git cli uses GIT_DIR to fast track its response however it might be set to a different path
    // depending on where the caller initiated this from, hence clear GIT_DIR
    delete process.env.GIT_DIR

    // The git repo root directory; this points to the root of a submodule instead of the parent
    const gitDir = await execGit(['rev-parse', '--show-toplevel'], options)

    // A super-project working tree exists only in submodules; poinst to the parent root
    const superprojectWorkingTree = await execGit(
      ['rev-parse', '--show-superproject-working-tree'],
      options
    )

    const isSubmodule = !!superprojectWorkingTree
    const gitConfigDir = await resolveGitConfigDir({ gitDir, isSubmodule })

    return { gitDir: normalize(gitDir), gitConfigDir, isSubmodule }
  } catch (error) {
    return { error, gitDir: null }
  }
}
