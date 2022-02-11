import debug from 'debug'
import execa from 'execa'

import { existFile } from './file.js'

const debugLog = debug('lint-staged:execGit')

/**
 * Explicitly never recurse commands into submodules, overriding local/global configuration.
 * @see https://git-scm.com/docs/git-config#Documentation/git-config.txt-submodulerecurse
 */
const NO_SUBMODULE_RECURSE = ['-c', 'submodule.recurse=false']

// exported for tests
export const GIT_GLOBAL_OPTIONS = [...NO_SUBMODULE_RECURSE]

export const execGit = async (cmd, options = {}) => {
  debugLog('Running git command', cmd)
  try {
    const { stdout } = await execa('git', GIT_GLOBAL_OPTIONS.concat(cmd), {
      ...options,
      all: true,
      cwd: options.cwd || process.cwd(),
    })
    return stdout
  } catch ({ all }) {
    throw new Error(all)
  }
}

export const reliableExecGit = (gitDir, gitLockPath, retryCount) => {
  let count = retryCount

  return async function fn(cmd, options = {}) {
    {
      const timeout = 5000 // 5s
      const deadlineTime = Date.now() + timeout

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const lock = await existFile(gitLockPath)

        if (!lock) {
          break
        }

        if (Date.now() > deadlineTime) {
          throw new Error('execute git command timeout')
        }
      }
    }

    try {
      return await execGit(cmd, {
        ...options,
        cwd: gitDir,
      })
    } catch (error) {
      if (--count === 1) {
        throw error
      }

      // 1s => 2s => 3s ...
      await new Promise((r) => setTimeout(r, (retryCount - count) * 1000))

      return await fn(cmd, options)
    }
  }
}
