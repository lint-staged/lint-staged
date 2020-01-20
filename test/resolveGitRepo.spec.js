import normalize from 'normalize-path'
import path from 'path'

import resolveGitRepo from '../lib/resolveGitRepo'

/**
 * resolveGitRepo runs execa, so the mock needs to be disabled for these tests
 */
jest.unmock('execa')

describe('resolveGitRepo', () => {
  it('should resolve to current working dir when .git is in the same dir', async () => {
    const cwd = normalize(process.cwd())
    const { gitDir } = await resolveGitRepo()
    expect(gitDir).toEqual(cwd)
  })

  it('should resolve to the parent dir when .git is in the parent dir', async () => {
    const expected = normalize(path.dirname(__dirname))
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    const { gitDir } = await resolveGitRepo()
    expect(gitDir).toEqual(expected)
    process.cwd = processCwdBkp
  })

  it('should resolve to the parent dir when .git is in the parent dir even when the GIT_DIR environment variable is set', async () => {
    const expected = normalize(path.dirname(__dirname))
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    process.env.GIT_DIR = 'wrong/path/.git' // refer to https://github.com/DonJayamanne/gitHistoryVSCode/issues/233#issuecomment-375769718
    const { gitDir } = await resolveGitRepo()
    expect(gitDir).toEqual(expected)
    process.cwd = processCwdBkp
  })

  it('should return null when not in a git directory', async () => {
    const { gitDir } = await resolveGitRepo({ cwd: '/' }) // assume root is not a git directory
    expect(gitDir).toEqual(null)
  })
})
