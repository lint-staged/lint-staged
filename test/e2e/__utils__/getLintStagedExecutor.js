import { resolve } from 'node:path'

import { execaCommand } from 'execa'

const lintStagedRelativePath = '../../../bin/lint-staged.js'

/**
 * @param {string} cwd
 * @return {Function}
 */
export const getLintStagedExecutor =
  (cwd) =>
  async (params = '') => {
    let command = resolve(__dirname, lintStagedRelativePath)
    return await execaCommand(`${command} --cwd=${cwd} ${params}`)
  }
