import path from 'path'
import { fileURLToPath } from 'url'

import normalize from 'normalize-path'

import { determineGitDir, resolveGitRepo } from '../lib/resolveGitRepo.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

  it('should resolve to the parent dir when .git is in the parent dir even when the GIT_WORK_TREE environment variable is set', async () => {
    const expected = normalize(path.dirname(__dirname))
    const processCwdBkp = process.cwd
    process.cwd = () => __dirname
    process.env.GIT_WORK_TREE = './wrong/path/'
    const { gitDir } = await resolveGitRepo()
    expect(gitDir).toEqual(expected)
    process.cwd = processCwdBkp
  })

  it('should return null when not in a git directory', async () => {
    const { gitDir } = await resolveGitRepo({ cwd: '/' }) // assume root is not a git directory
    expect(gitDir).toEqual(null)
  })

  describe('determineGitDir', () => {
    it('should resolve to current working dir when relative dir is empty', () => {
      const cwd = process.cwd()
      const relativeDir = undefined
      const rootDir = determineGitDir(cwd, relativeDir)
      expect(rootDir).toEqual(normalize(cwd))
    })

    it('should resolve to parent dir when relative dir is child', () => {
      const relativeDir = 'bar'
      const cwd = process.cwd() + path.sep + 'bar'
      const rootDir = determineGitDir(cwd, relativeDir)
      expect(rootDir).toEqual(normalize(process.cwd()))
    })

    it('should resolve to parent dir when relative dir is child and child has trailing dir separator', () => {
      const relativeDir = 'bar' + path.sep
      const cwd = process.cwd() + path.sep + 'bar'
      const rootDir = determineGitDir(cwd, relativeDir)
      expect(rootDir).toEqual(normalize(process.cwd()))
    })
  })
})
