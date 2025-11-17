import { exec as tinyexec } from 'tinyexec'

/**
 * @param {import('tinyexec').TinyExec} proc
 * @returns {Promise<string>}
 */
const collectOutput = async (proc) => {
  let output = ''

  for await (const line of proc) {
    output += line + '\n'
  }

  return output.trimEnd()
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 * @returns {{ proc: import('tinyexec').TinyExec; output: Promise<string> }}
 */
export const exec = (cmd, args, options) => {
  const cwd = options?.cwd ?? process.cwd()

  const proc = tinyexec(cmd, args, {
    nodeOptions: { cwd, stdio: ['ignore'] },
  })

  const result = collectOutput(proc).then((result) => {
    if (proc.exitCode > 0) {
      throw new Error(result, { cause: proc })
    }

    return result
  })

  return { proc, result }
}
