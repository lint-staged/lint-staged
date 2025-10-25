import { EOL } from 'node:os'

import { exec as tinyexec } from 'tinyexec'

/**
 * @param {import('tinyexec').TinyExec} proc
 * @returns {Promise<string>}
 */
const collectOutput = async (proc) => {
  let output = ''

  for await (const line of proc) {
    output += line + EOL
  }

  return output.trimEnd()
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 * @returns {Promise<string>}
 */
export const exec = async (cmd, args, options) => {
  const cwd = options?.cwd ?? process.cwd()

  const proc = tinyexec(cmd, args, {
    nodeOptions: { cwd, stdio: ['ignore'] },
  })

  const output = await collectOutput(proc)

  if (proc.exitCode > 0) {
    throw new Error(output, { cause: proc })
  }

  return output
}
