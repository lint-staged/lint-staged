import { spawn } from 'node:child_process'
import { once } from 'node:events'

/**
 * @typedef {Object} Options
 * @property {String} cwd the directory to spawn the file in
 */

/**
 * Spawn a file using Node.js internal child_process, wrapped in a promise
 *
 * @param {string} file the file to spawn
 * @param {string[]} [args] the args to pass to the file
 * @param {Options} [options]
 * @returns {Promise<string>} the output of the spawned file
 */
export const exec = async (file, args, options) => {
  const buffer = []

  const program = spawn(file, args, { cwd: options?.cwd })

  program.stdout.on('data', (chunk) => buffer.push(chunk))
  program.stderr.on('data', (chunk) => buffer.push(chunk))

  const [exitCode] = await once(program, 'exit')

  const output = buffer
    .reduce((result, chunk) => {
      result += chunk.toString()
      return result
    }, '')
    .replace(/\n$/, '')

  if (exitCode !== 0) {
    throw new Error(output)
  }

  return output
}
