import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import tty from 'node:tty'

const getHandle = async () => {
  if (process.platform === 'win32') {
    return await fs.open('CONOUT$', constants.O_WRONLY | constants.O_EXCL, 0o666)
  } else {
    return await fs.open('/dev/tty', constants.O_WRONLY + constants.O_NOCTTY)
  }
}

/**
 * Try to override the `process.stdout` with a TTY `tty.WriteStream`.
 * When invoking lint-staged through Git hooks, the shell might not
 * be a TTY, but we still want to enable spinners in a "non-hacky" way.
 *
 * @returns {Promise<fs.FileHandle | null>} the `FileHandle` pointing to the TTY, or `null` when failed.
 */
export const forceTty = async () => {
  /** No need to do anything if stdout is already a TTY. */
  if (process.stdout.isTTY) return null

  try {
    const handle = await getHandle()

    console.log('forceTTY handle:')
    console.log(handle)

    /**
     * Probably not realistic that the TTY handle is not a TTY,
     * but close the handle just in case.
     */
    if (!tty.isatty(handle.fd)) {
      await handle.close()
      return null
    }

    const stdout = new tty.WriteStream(handle.fd)

    console.log('forceTTY stdout:')
    console.log(stdout)

    /** Override `process.stdout` */
    Object.defineProperty(process, 'stdout', {
      configurable: true,
      enumerable: true,
      get: () => stdout,
    })

    return handle
  } catch (error) {
    console.error('forceTTY error:')
    console.error(error)
    return null
  }
}
