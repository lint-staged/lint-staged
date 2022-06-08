import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'

import normalize from 'normalize-path'
import { ensureDir } from 'fs-extra'

/**
 * Create temporary random directory and return its path
 * @returns {Promise<String>}
 */
export const createTempDir = async () => {
  const tempDir = await fs.realpath(tmpdir())
  const dirname = path.join(tempDir, `lint-staged-${randomBytes(16).toString('hex')}`)
  await ensureDir(dirname)
  return normalize(dirname)
}
