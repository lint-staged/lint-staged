import path from 'node:path'
import { execPath } from 'node:process'

import { exec } from '../../../lib/exec.js'
import { getRepoRootPath } from '../../__utils__/getRepoRootPath.js'

const lintStagedBin = path.resolve(getRepoRootPath(), 'bin/lint-staged.js')

/**
 * @param {string} cwd
 * @return {Function}
 */
export const getLintStagedExecutor =
  (cwd) =>
  (params = [], options) =>
    exec(execPath, [lintStagedBin, ...params], { cwd, ...options })
