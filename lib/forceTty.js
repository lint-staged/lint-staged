import fs from 'node:fs'
import tty from 'node:tty'

const getTtyFd = () => {
  if (process.platform === 'win32') {
    // We need to call the underlying C++ bindings directly to open the special
    // path 'CONOUT$', because otherwise the `fs` library in JS will interpret
    // that as a filesystem path like '.\CONOUT$'.
    const cfs = process.binding('fs')
    const path = 'CONOUT$'
    return cfs.open(path, fs.constants.O_RDWR | fs.constants.O_EXCL, 0o666, undefined, { path })
  } else {
    return fs.openSync('/dev/tty', fs.constants.O_WRONLY | fs.constants.O_NOCTTY)
  }
}

/**
 * Try to override the `process.stdout` with a TTY `tty.WriteStream`.
 * When invoking lint-staged through Git hooks, the shell might not
 * be a TTY, but we still want to enable spinners in a "non-hacky" way.
 *
 * @returns {Promise<number | null>} the numeric file descriptor pointing to the TTY, or `null` when failed.
 */
export const forceTty = async () => {
  /** No need to do anything if stdout is already a TTY. */
  if (process.stdout.isTTY) return null

  try {
    const ttyFd = await getTtyFd()

    /**
     * Probably not realistic that the TTY fd is not a TTY,
     * but close the handle just in case.
     */
    if (!tty.isatty(ttyFd)) {
      fs.closeSync(ttyFd)
      return null
    }

    const stdout = new tty.WriteStream(ttyFd)

    /** Override `process.stdout` */
    Object.defineProperty(process, 'stdout', {
      configurable: true,
      enumerable: true,
      get: () => stdout,
    })

    return ttyFd
  } catch (error) {
    console.error('forceTTY error:', error)
    return null
  }
}
