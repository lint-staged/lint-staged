import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import normalize from 'normalize-path'

/**
 * Create temporary random directory and return its path
 * @returns {Promise<String>}
 */
export const createTempDir = async () => {
  const tempDir = await fs.realpath(os.tmpdir())
  const dirname = path.join(tempDir, `lint-staged-${crypto.randomUUID()}`)
  await fs.mkdir(dirname, { recursive: true })
  return normalize(dirname)
}
