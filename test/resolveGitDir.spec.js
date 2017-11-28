import path from 'path'
import resolveGitDir from '../src/resolveGitDir'

describe('resolveGitDir', () => {
  it('should resolve to current working dir when .git is in the same dir', () => {
    const expected = process.cwd()
    expect(resolveGitDir()).toEqual(expected)
  })

  it('should resolve to the parent dir when .git is in the parent dir', () => {
    const expected = path.dirname(__dirname)
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    // path.resolve to strip trailing slash
    expect(path.resolve(resolveGitDir())).toEqual(expected)
    process.cwd = processCwdBkp
  })
})
