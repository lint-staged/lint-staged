import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { execGit } from '../../lib/execGit.js'
import { resolveGitRepo } from '../../lib/resolveGitRepo.js'
import { normalizePath } from '../../lib/normalizePath.js'

describe('execGit', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const repoRoot = normalizePath(path.join(__dirname, '../../'))

  it('should be able to run commands in the git repo root', async () => {
    const { gitDir } = await resolveGitRepo()
    expect(gitDir).toBeDefined()
    expect(typeof gitDir).toEqual('string')

    const topLevel = await execGit(['rev-parse', '--show-toplevel'], { cwd: gitDir })

    expect(normalizePath(topLevel)).toEqual(repoRoot)
  })

  it('should be able to run commands in the git config dir', async () => {
    const { gitConfigDir } = await resolveGitRepo()
    expect(gitConfigDir).toBeDefined()
    expect(typeof gitConfigDir).toEqual('string')

    await expect(
      execGit(['rev-parse', '--show-toplevel'], { cwd: gitConfigDir })
    ).rejects.toThrowError('this operation must be run in a work tree')
  })
})
