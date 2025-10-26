import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

/**
 * End process by pid, forcefully, including child processes
 *
 * @see {@link https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill}
 *
 * @param {import('node:child_process').ChildProcess} childProcess
 */
const killWin32Subprocesses = async (childProcess) => {
  await execAsync(`taskkill /pid ${childProcess.pid} /T /F`)
}

/**
 * Kill all processes in the group by using negative pid
 *
 * @see {@link https://pubs.opengroup.org/onlinepubs/9699919799/functions/kill.html}
 *
 * @param {import('node:child_process').ChildProcess} childProcess
 */
const killUnixSubprocesses = async (childProcess) => {
  process.kill(-childProcess.pid, 'SIGKILL')
}

/**
 * @param {import('node:child_process').ChildProcess} childProcess
 * @param {boolean} [isWin32]
 */
export const killSubProcesses = async (childProcess, isWin32 = process.platform === 'win32') => {
  if (!childProcess.pid) {
    return
  }

  try {
    if (isWin32) {
      await killWin32Subprocesses(childProcess)
    } else {
      await killUnixSubprocesses(childProcess)
    }
  } catch {
    /** ignore errors */
  }
}
