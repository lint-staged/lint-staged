import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { execaCommand } from 'execa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const lintStagedBin = path.resolve(__dirname, '../../../bin/lint-staged.js')

/**
 * @param {string} cwd
 * @return {Function}
 */
export const getLintStagedExecutor =
  (cwd) =>
  (params = '', options) =>
    execaCommand(`${lintStagedBin} --cwd=${cwd} ${params}`, options)
