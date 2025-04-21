import debug from 'debug'

import { exec } from './exec.js'

const debugLog = debug('lint-staged:execGit')

/**
 * Explicitly never recurse commands into submodules, overriding local/global configuration.
 * @see https://git-scm.com/docs/git-config#Documentation/git-config.txt-submodulerecurse
 */
const NO_SUBMODULE_RECURSE = ['-c', 'submodule.recurse=false']

// exported for tests
export const GIT_GLOBAL_OPTIONS = [...NO_SUBMODULE_RECURSE]

export const execGit = async (cmd, options) => {
  debugLog('Running git command', cmd)

  try {
    const result = await exec('git', [...GIT_GLOBAL_OPTIONS, ...cmd], { cwd: options?.cwd })
    return result.output
  } catch (failedResult) {
    throw new Error(failedResult.output, {
      cause: failedResult,
    })
  }
}
