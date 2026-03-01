import { fork } from 'node:child_process'
import path from 'node:path'

import { getRepoRootPath } from '../../__utils__/getRepoRootPath.js'

export const lintStagedBin = path.resolve(getRepoRootPath(), 'bin/lint-staged.js')

/** @type {(params?: string[], options?: import('node:child_process').ForkOptions) => Promise<string>} */
export const forkLintStagedBin = async (params = [], options) => {
  const child = fork(lintStagedBin, params, {
    ...options,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  })

  let output = ''
  child.stdout.on('data', (chunk) => (output += chunk))
  child.stderr.on('data', (chunk) => (output += chunk))

  await new Promise((resolve, reject) => {
    child.on('close', resolve)
    child.on('error', reject)
  })

  if (child.exitCode) {
    throw new Error(output, { cause: child })
  }

  return output
}
