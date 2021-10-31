import fs from 'fs-extra'
import os from 'os'
import path from 'path'

const osTmpDir = fs.realpathSync(process.env.RUNNER_TEMP || os.tmpdir())

/**
 * Create temporary random directory and return its path
 * @returns {Promise<String>}
 */
export const createTempDir = async () => {
  const random = Date.now().toString(36) + Math.random().toString(36).substr(2)
  const dirname = path.resolve(osTmpDir, `lint-staged-${random}`)
  await fs.ensureDir(dirname)
  return dirname
}
