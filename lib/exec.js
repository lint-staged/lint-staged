import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { pipeline } from 'node:stream/promises'

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
  async function* pipeToBuffer(source) {
    source.setEncoding('utf8')
    for await (const chunk of source) {
      yield buffer.push(chunk)
    }
  }

  const program = spawn(file, args, { cwd: options?.cwd })

  await Promise.allSettled([
    pipeline(program.stdout, pipeToBuffer),
    pipeline(program.stderr, pipeToBuffer),
    once(program, 'exit'),
  ])

  const output = buffer.reduce((result, chunk) => result + chunk, '').replace(/\n$/, '')

  if (program.exitCode !== 0) {
    throw new Error(output)
  }

  return output
}
