import getStagedFiles from '../src/getStagedFiles'
import execGit from '../src/execGit'

jest.mock('../src/execGit')

describe('getStagedFiles', () => {
  it('should return array of only staged file names when all is not specified', async () => {
    execGit.mockImplementationOnce(async cmd =>
      cmd[0] === 'ls-tree' ? 'foo.js\nbar.js\nbaz.js' : 'foo.js\nbar.js'
    )
    const staged = await getStagedFiles()
    expect(staged).toEqual(['foo.js', 'bar.js'])
  })

  it('should return array of all file names when all is true', async () => {
    execGit.mockImplementationOnce(async cmd =>
      cmd[0] === 'ls-tree' ? 'foo.js\nbar.js\nbaz.js' : 'foo.js\nbar.js'
    )
    const staged = await getStagedFiles({ all: true })
    expect(staged).toEqual(['foo.js', 'bar.js', 'baz.js'])
  })

  it('should return array of only staged file names when all is false', async () => {
    execGit.mockImplementationOnce(async cmd =>
      cmd[0] === 'ls-tree' ? 'foo.js\nbar.js\nbaz.js' : 'foo.js\nbar.js'
    )
    const staged = await getStagedFiles({ all: false })
    expect(staged).toEqual(['foo.js', 'bar.js'])
  })

  it('should return empty array when no staged files', async () => {
    execGit.mockImplementationOnce(async () => '')
    const staged = await getStagedFiles()
    expect(staged).toEqual([])
  })

  it('should return null in case of error', async () => {
    execGit.mockImplementationOnce(async () => {
      throw new Error('fatal: not a git repository (or any of the parent directories): .git')
    })
    const staged = await getStagedFiles()
    expect(staged).toEqual(null)
  })
})
