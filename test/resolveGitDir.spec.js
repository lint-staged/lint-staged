import path from 'path'
import resolveGitDir from '../src/resolveGitDir'

describe('resolveGitDir', () => {
  it('should resolve to current working dir when .git is in the same dir', async () => {
    const cwd = process.cwd()
    const gitDir = await resolveGitDir()
    expect(gitDir).toEqual(cwd)
  })

  it('should resolve to the parent dir when .git is in the parent dir', async () => {
    const expected = path.dirname(__dirname)
    const processCwdBkp = process.cwd
    const gitDir = await resolveGitDir()

    process.cwd = () => __dirname
    // path.resolve to strip trailing slash
    expect(path.resolve(gitDir)).toEqual(expected)
    process.cwd = processCwdBkp
  })
})
