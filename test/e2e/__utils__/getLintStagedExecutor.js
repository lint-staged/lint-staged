import path from 'node:path'

import { execaCommand } from 'execa'

import { getRepoRootPath } from '../../__utils__/getRepoRootPath.js'

const lintStagedBin = path.resolve(getRepoRootPath(), 'bin/lint-staged.js')

/**
 * @param {string} cwd
 * @return {Function}
 */
export const getLintStagedExecutor =
  (cwd) =>
  (params = '', options) =>
    execaCommand(`${lintStagedBin} --cwd=${cwd} ${params}`, options)
