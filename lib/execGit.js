import { createDebug } from './debug.js'
import { exec } from './exec.js'

const debugLog = createDebug('lint-staged:execGit')

/**
 * Explicitly never recurse commands into submodules, overriding local/global configuration.
 * @see https://git-scm.com/docs/git-config#Documentation/git-config.txt-submodulerecurse
 */
const NO_SUBMODULE_RECURSE = ['-c', 'submodule.recurse=false']

// exported for tests
export const GIT_GLOBAL_OPTIONS = [...NO_SUBMODULE_RECURSE]

/** @type {(cmd: string[], options?: { cwd?: string }) => Promise<string>} */
export const execGit = async (cmd, options) => {
  debugLog('Running git command', cmd)
  const { result } = exec('git', [...NO_SUBMODULE_RECURSE, ...cmd], options)
  return await result
}
