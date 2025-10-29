import path from 'node:path'

import { afterEach, describe, it, vi } from 'vitest'

import { normalizePath } from '../../lib/normalizePath.js'

vi.mock('../../lib/execGit.js', () => ({
  execGit: vi.fn(async () => ''),
}))

const { execGit } = await import('../../lib/execGit.js')
const { getAllFiles, getStagedFiles } = await import('../../lib/getStagedFiles.js')

// Windows filepaths
const normalizeWindowsPath = (input) => normalizePath(path.resolve('/', input))

describe('getStagedFiles', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return array of file names', async ({ expect }) => {
    execGit.mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js\u0000:000000 100644 0000000 0000000 A\u0000bar.js\u0000'
    )

    const staged = await getStagedFiles({ cwd: '/' })
    // Windows filepaths
    expect(staged).toEqual([
      { filepath: normalizeWindowsPath('/foo.js'), status: 'A' },
      { filepath: normalizeWindowsPath('/bar.js'), status: 'A' },
    ])

    expect(execGit).toHaveBeenCalledExactlyOnceWith(
      ['diff', '--diff-filter=ACMR', '--staged', '--raw', '-z'],
      { cwd: '/' }
    )
  })

  it('should allow colons in file names', async ({ expect }) => {
    execGit.mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js\u0000:000000 100644 0000000 0000000 A\u0000bar:qux.js\u0000'
    )

    const staged = await getStagedFiles({ cwd: '/' })
    // Windows filepaths
    expect(staged).toEqual([
      { filepath: normalizeWindowsPath('/foo.js'), status: 'A' },
      { filepath: normalizeWindowsPath('/bar:qux.js'), status: 'A' },
    ])

    expect(execGit).toHaveBeenCalledExactlyOnceWith(
      ['diff', '--diff-filter=ACMR', '--staged', '--raw', '-z'],
      { cwd: '/' }
    )
  })

  it('should return empty array when no staged files', async ({ expect }) => {
    const staged = await getStagedFiles()
    expect(staged).toEqual([])
  })

  it('should return null in case of error', async ({ expect }) => {
    execGit.mockImplementationOnce(async () => {
      throw new Error('fatal: not a git repository (or any of the parent directories): .git')
    })
    const staged = await getStagedFiles({})
    expect(staged).toEqual(null)
  })

  it('should support overriding diff trees with ...', async ({ expect }) => {
    execGit.mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js\u0000:000000 100644 0000000 0000000 A\u0000bar.js\u0000'
    )

    const staged = await getStagedFiles({ cwd: '/', diff: 'main...my-branch' })
    // Windows filepaths
    expect(staged).toEqual([
      { filepath: normalizeWindowsPath('/foo.js'), status: 'A' },
      { filepath: normalizeWindowsPath('/bar.js'), status: 'A' },
    ])

    expect(execGit).toHaveBeenCalledExactlyOnceWith(
      ['diff', '--diff-filter=ACMR', 'main...my-branch', '--raw', '-z'],
      { cwd: '/' }
    )
  })

  it('should support overriding diff trees with multiple args', async ({ expect }) => {
    execGit.mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js\u0000:000000 100644 0000000 0000000 A\u0000bar.js\u0000'
    )

    const staged = await getStagedFiles({ cwd: '/', diff: 'main my-branch' })
    // Windows filepaths
    expect(staged).toEqual([
      { filepath: normalizeWindowsPath('/foo.js'), status: 'A' },
      { filepath: normalizeWindowsPath('/bar.js'), status: 'A' },
    ])

    expect(execGit).toHaveBeenCalledExactlyOnceWith(
      ['diff', '--diff-filter=ACMR', 'main', 'my-branch', '--raw', '-z'],
      { cwd: '/' }
    )
  })

  it('should support overriding diff-filter', async ({ expect }) => {
    execGit.mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js\u0000:000000 100644 0000000 0000000 A\u0000bar.js\u0000'
    )

    const staged = await getStagedFiles({ cwd: '/', diffFilter: 'ACDMRTUXB' })
    // Windows filepaths
    expect(staged).toEqual([
      { filepath: normalizeWindowsPath('/foo.js'), status: 'A' },
      { filepath: normalizeWindowsPath('/bar.js'), status: 'A' },
    ])

    expect(execGit).toHaveBeenCalledExactlyOnceWith(
      ['diff', '--diff-filter=ACDMRTUXB', '--staged', '--raw', '-z'],
      { cwd: '/' }
    )
  })
})

describe('getAllFiles', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return all tracked files', async ({ expect }) => {
    execGit.mockImplementationOnce(async () => 'file1.js\nfile2.ts\ndir/file3.css')

    const files = await getAllFiles({ cwd: '/' })
    expect(files).toHaveLength(3)
    expect(files[0]).toMatchObject({
      filepath: normalizeWindowsPath('/file1.js'),
      status: 'M',
    })
    expect(files[1]).toMatchObject({
      filepath: normalizeWindowsPath('/file2.ts'),
      status: 'M',
    })
    expect(files[2]).toMatchObject({
      filepath: normalizeWindowsPath('/dir/file3.css'),
      status: 'M',
    })

    expect(execGit).toHaveBeenCalledExactlyOnceWith(['ls-files'], { cwd: '/' })
  })

  it('should handle empty repository', async ({ expect }) => {
    execGit.mockImplementationOnce(async () => '')

    const files = await getAllFiles()

    expect(files).toEqual([])
  })

  it('should return null on git command failure', async ({ expect }) => {
    execGit.mockImplementationOnce(async () => {
      throw new Error('fatal: not a git repository (or any of the parent directories): .git')
    })

    const files = await getAllFiles()

    expect(files).toBeNull()
  })
})
