import normalize from 'normalize-path'
import path from 'path'

import resolveGitDir from '../lib/resolveGitDir'

/**
 * resolveGitDir runs execa, so the mock needs to be disabled for these tests
 */
jest.unmock('execa')

describe('resolveGitDir', () => {
  it('should resolve to current working dir when .git is in the same dir', async () => {
    const expected = normalize(process.cwd())
    expect(await resolveGitDir()).toEqual(expected)
  })

  it('should resolve to the parent dir when .git is in the parent dir', async () => {
    const expected = normalize(path.dirname(__dirname))
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    expect(await resolveGitDir()).toEqual(expected)
    process.cwd = processCwdBkp
  })

  it('should resolve to the parent dir when .git is in the parent dir even when the GIT_DIR environment variable is set', async () => {
    const expected = normalize(path.dirname(__dirname))
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    process.env.GIT_DIR = 'wrong/path/.git' // refer to https://github.com/DonJayamanne/gitHistoryVSCode/issues/233#issuecomment-375769718
    expect(await resolveGitDir()).toEqual(expected)
    process.cwd = processCwdBkp
  })

  it('should return null when not in a git directory', async () => {
    const gitDir = await resolveGitDir({ cwd: '/' }) // assume root is not a git directory
    expect(gitDir).toEqual(null)
  })
})
