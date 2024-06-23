import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizePath } from '../../lib/normalizePath.js'
import { resolveGitRepo } from '../../lib/resolveGitRepo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('resolveGitRepo', () => {
  it('should resolve to current working dir when .git is in the same dir', async () => {
    const cwd = normalizePath(process.cwd())
    const { topLevelDir } = await resolveGitRepo()
    expect(topLevelDir).toEqual(cwd)
  })

  const expected = normalizePath(path.join(path.dirname(__dirname), '../'))

  it('should resolve to the parent dir when .git is in the parent dir', async () => {
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    const { topLevelDir } = await resolveGitRepo()
    expect(topLevelDir).toEqual(expected)
    process.cwd = processCwdBkp
  })

  it('should resolve to the parent dir when .git is in the parent dir even when the GIT_DIR environment variable is set', async () => {
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    process.env.GIT_DIR = 'wrong/path/.git' // refer to https://github.com/DonJayamanne/gitHistoryVSCode/issues/233#issuecomment-375769718
    const { topLevelDir } = await resolveGitRepo()
    expect(topLevelDir).toEqual(expected)
    process.cwd = processCwdBkp
  })

  it('should resolve to the parent dir when .git is in the parent dir even when the GIT_WORK_TREE environment variable is set', async () => {
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    process.env.GIT_WORK_TREE = './wrong/path/'
    const { topLevelDir } = await resolveGitRepo()
    expect(topLevelDir).toEqual(expected)
    process.cwd = processCwdBkp
  })

  it('should return null when not in a git directory', async () => {
    const { topLevelDir } = await resolveGitRepo({ cwd: '/' }) // assume root is not a git directory
    expect(topLevelDir).toEqual(null)
  })
})
