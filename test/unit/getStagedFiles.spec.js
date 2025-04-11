import path from 'node:path'

import { jest } from '@jest/globals'

import { normalizePath } from '../../lib/normalizePath.js'

jest.unstable_mockModule('../../lib/execGit.js', () => ({
  execGit: jest.fn(async () => ''),
}))

const { execGit } = await import('../../lib/execGit.js')
const { getStagedFiles } = await import('../../lib/getStagedFiles.js')

// Windows filepaths
const normalizeWindowsPath = (input) => normalizePath(path.resolve('/', input))

describe('getStagedFiles', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return array of file names', async () => {
    execGit.mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js:000000 100644 0000000 0000000 A\u0000bar.js'
    )

    const staged = await getStagedFiles({ cwd: '/' })
    // Windows filepaths
    expect(staged).toEqual([normalizeWindowsPath('/foo.js'), normalizeWindowsPath('/bar.js')])

    expect(execGit).toHaveBeenCalledWith(
      ['diff', '--diff-filter=ACMR', '--staged', '--raw', '-z'],
      { cwd: '/' }
    )
  })

  it('should return empty array when no staged files', async () => {
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

  it('should support overriding diff trees with ...', async () => {
    execGit.mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js:000000 100644 0000000 0000000 A\u0000bar.js'
    )

    const staged = await getStagedFiles({ cwd: '/', diff: 'main...my-branch' })
    // Windows filepaths
    expect(staged).toEqual([normalizeWindowsPath('/foo.js'), normalizeWindowsPath('/bar.js')])

    expect(execGit).toHaveBeenCalledWith(
      ['diff', '--diff-filter=ACMR', 'main...my-branch', '--raw', '-z'],
      { cwd: '/' }
    )
  })

  it('should support overriding diff trees with multiple args', async () => {
    execGit.mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js:000000 100644 0000000 0000000 A\u0000bar.js'
    )

    const staged = await getStagedFiles({ cwd: '/', diff: 'main my-branch' })
    // Windows filepaths
    expect(staged).toEqual([normalizeWindowsPath('/foo.js'), normalizeWindowsPath('/bar.js')])

    expect(execGit).toHaveBeenCalledWith(
      ['diff', '--diff-filter=ACMR', 'main', 'my-branch', '--raw', '-z'],
      { cwd: '/' }
    )
  })

  it('should support overriding diff-filter', async () => {
    execGit.mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js:000000 100644 0000000 0000000 A\u0000bar.js'
    )

    const staged = await getStagedFiles({ cwd: '/', diffFilter: 'ACDMRTUXB' })
    // Windows filepaths
    expect(staged).toEqual([normalizeWindowsPath('/foo.js'), normalizeWindowsPath('/bar.js')])

    expect(execGit).toHaveBeenCalledWith(
      ['diff', '--diff-filter=ACDMRTUXB', '--staged', '--raw', '-z'],
      { cwd: '/' }
    )
  })
})
