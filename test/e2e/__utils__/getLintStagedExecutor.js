import { resolve } from 'node:path'

import { execaCommand } from 'execa'

let lintStagedBin = resolve(__dirname, '../../../bin/lint-staged.js')

/**
 * @param {string} cwd
 * @return {Function}
 */
export const getLintStagedExecutor =
  (cwd) =>
  async (params = '') =>
    await execaCommand(`${lintStagedBin} --cwd=${cwd} ${params}`)
