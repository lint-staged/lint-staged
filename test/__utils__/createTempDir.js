import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { normalizePath } from '../../lib/normalizePath.js'

/**
 * Create temporary random directory and return its path
 * @returns {Promise<String>}
 */
export const createTempDir = async () => {
  const baseDir = await fs.realpath(
    process.env.GITHUB_ACTIONS === 'true' ? process.env.RUNNER_TEMP : os.tmpdir()
  )

  const tempDir = path.join(baseDir, 'lint-staged', crypto.randomUUID())
  await fs.mkdir(tempDir, { recursive: true })

  return normalizePath(tempDir)
}
