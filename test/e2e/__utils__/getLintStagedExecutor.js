import { resolve } from 'node:path'

import { execaCommand } from 'execa'

const lintStagedBin = resolve(__dirname, '../../../bin/lint-staged.js')

/**
 * @param {string} cwd
 * @return {Function}
 */
export const getLintStagedExecutor =
  (cwd) =>
  (params = '', options) =>
    execaCommand(`${lintStagedBin} --cwd=${cwd} ${params}`, options)
