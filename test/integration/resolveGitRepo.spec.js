import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizePath } from '../../lib/normalizePath.js'
import { resolveGitRepo } from '../../lib/resolveGitRepo.js'

describe('resolveGitRepo', () => {
  it('should resolve to repo root', async () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const repoRoot = normalizePath(path.join(__dirname, '../../'))
    const { topLevelDir } = await resolveGitRepo(__dirname)
    expect(topLevelDir).toEqual(normalizePath(repoRoot))
  })
})
