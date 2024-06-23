import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizePath } from '../../lib/normalizePath.js'
import { resolveGitRepo } from '../../lib/resolveGitRepo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = normalizePath(path.join(__dirname, '../../'))

describe('resolveGitRepo', () => {
  it('should resolve to repo root', async () => {
    const { topLevelDir } = await resolveGitRepo(__dirname)
    expect(topLevelDir).toEqual(normalizePath(REPO_ROOT))
  })

  it('should return "topLevelDir" value compatible with node:child_process', async () => {
    const { topLevelDir } = await resolveGitRepo(__dirname)
    expect(topLevelDir).toEqual(normalizePath(REPO_ROOT))

    const { stdout } = spawnSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: topLevelDir,
      encoding: 'utf-8',
    })

    expect(stdout).toMatch('lint-staged')
  })

  it('should return "gitConfigDir" value compatible with node:child_process', async () => {
    const { gitConfigDir } = await resolveGitRepo()

    // Path ends in "/.git"
    expect(normalizePath(gitConfigDir)).toEqual(normalizePath(path.join(REPO_ROOT, '.git')))

    const { stderr } = spawnSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: gitConfigDir,
      encoding: 'utf-8',
    })

    expect(stderr).toMatch('this operation must be run in a work tree')
  })
})
