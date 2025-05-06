import path from 'node:path'

import spawn from 'nano-spawn'

import { getRepoRootPath } from '../../__utils__/getRepoRootPath.js'

const lintStagedBin = path.resolve(getRepoRootPath(), 'bin/lint-staged.js')

/**
 * @param {string} cwd
 * @returns {(params?: string[], options?: import('nano-spawn').Options) => import('nano-spawn').Subprocess}
 */
export const getLintStagedExecutor =
  (cwd) =>
  (params = [], options) =>
    spawn('node', [lintStagedBin, `--cwd=${cwd}`, ...params], options)
