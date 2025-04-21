import { spawn } from 'node:child_process'
import { once } from 'node:events'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

const resolvePathsToRoot = (localPaths, localPath) => {
  if (localPaths.at(-1) === localPath) {
    return localPaths
  }

  return resolvePathsToRoot([...localPaths, localPath], path.resolve(localPath, '..'))
}

const withNodeModulesPath = (cwd = process.cwd()) => {
  const paths = process.env.PATH.split(path.delimiter)
  const nodeModulesBins = resolvePathsToRoot([], path.resolve(cwd)).map((localPath) =>
    path.join(localPath, 'node_modules', '.bin')
  )

  return {
    ...process.env,
    PATH: [...nodeModulesBins, ...paths].join(path.delimiter),
  }
}

/** @type {(arr: string[]) => string} */
const stringifyArray = (arr) => arr.join('').trimEnd()

export class ExecError extends Error {
  constructor({ process, output }) {
    super('Failed to exec')
    this.process = process
    this.output = output
  }
}

/**
 * @typedef {Object} Options
 * @property {String} [cwd] the directory to spawn the file in
 * @property {String} [input] input passed to the spawned file
 *
 * @typedef {{ process: import('node:child_process').ChildProcessWithoutNullStreams; output?: string }} ExecPromise
 */

/**
 * Spawn a file using Node.js internal child_process, wrapped in a promise
 *
 * @param {string} file the file to spawn
 * @param {string[]} [args] the args to pass to the file
 * @param {Options} [options]
 * @returns {Promise<ExecPromise> & ExecPromise} the output of the spawned file
 */
export const exec = (file, args, options) => {
  const cwd = options?.cwd
  const input = options?.input

  const childProcess = spawn(file, args, { cwd, env: withNodeModulesPath(cwd) })

  const promise = (async () => {
    const outputArray = []

    const streamToArray = (arr) =>
      async function* streamToArray(source) {
        source.setEncoding('utf8')
        for await (const chunk of source) {
          yield arr.push(chunk)
        }
      }

    pipeline(childProcess.stdout, streamToArray(outputArray))
    pipeline(childProcess.stderr, streamToArray(outputArray))

    if (input) {
      childProcess.stdin.write(input)
      childProcess.stdin.end()
    }

    await once(childProcess, 'close')

    const output = stringifyArray(outputArray)

    if (childProcess.exitCode !== 0 || childProcess.killed || childProcess.signalCode != null) {
      throw new ExecError({ process, output })
    }

    return {
      process: childProcess,
      output,
    }
  })()

  promise.process = childProcess
  return promise
}
