import { exec } from 'tinyexec'

import { createDebug } from './debug.js'

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
  debugLog('Running git command:', cmd)
  const result = await exec('git', [...NO_SUBMODULE_RECURSE, ...cmd], {
    nodeOptions: {
      env: options?.env,
      cwd: options?.cwd,
    },
  })

  if (result.exitCode > 0) {
    throw new Error(result.stderr.trimEnd(), { cause: result })
  }

  return result.stdout.trimEnd()
}
