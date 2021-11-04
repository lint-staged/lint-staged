import getDiffFiles from '../lib/getDiffFiles'
import execGit from '../lib/execGit'

jest.mock('../lib/execGit')

describe('getDiffFiles', () => {
  it('should return array of file names', async () => {
    execGit.mockImplementationOnce(async () => 'foo.js\u0000bar.js\u0000')
    const staged = await getDiffFiles()
    expect(staged).toEqual(['foo.js', 'bar.js'])
  })

  it('should return empty array when no staged files', async () => {
    execGit.mockImplementationOnce(async () => '')
    const staged = await getDiffFiles()
    expect(staged).toEqual([])
  })

  it('should return null in case of error', async () => {
    execGit.mockImplementationOnce(async () => {
      throw new Error('fatal: not a git repository (or any of the parent directories): .git')
    })
    const staged = await getDiffFiles()
    expect(staged).toEqual(null)
  })
})
