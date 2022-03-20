import path from 'path'

import { jest } from '@jest/globals'
import normalize from 'normalize-path'

jest.unstable_mockModule('../lib/execGit', () => ({
  execGit: jest.fn(async () => ''),
}))

const { execGit } = await import('../lib/execGit.js')
const { getStagedFiles } = await import('../lib/getStagedFiles.js')

// Windows filepaths
const normalizePath = (input) => normalize(path.resolve('/', input))

describe('getStagedFiles', () => {
  it('should return array of file names', async () => {
    execGit.mockImplementationOnce(async () => 'foo.js\u0000bar.js\u0000')
    const staged = await getStagedFiles({ cwd: '/' })
    // Windows filepaths
    expect(staged).toEqual([normalizePath('/foo.js'), normalizePath('/bar.js')])
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
    const staged = await getStagedFiles({})
    expect(staged).toEqual(null)
  })
})
