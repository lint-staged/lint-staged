import { promisify } from 'node:util'
import { resolve } from 'node:path'

const exec = promisify(require('child_process').exec)
const lintStagedPath = '../../../bin/lint-staged.js'

/**
 * @param {string} cwd
 * @return {Function}
 */
export const getLintStagedExecutor =
  (cwd) =>
  async (params = '') =>
    await exec(resolve(__dirname, `${lintStagedPath} --cwd=${cwd} ${params}`))
