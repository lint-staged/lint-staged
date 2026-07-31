import path from 'node:path'

import { afterEach, describe, it, vi } from 'vitest'

import { execGit } from '../../lib/execGit.js'
import { readFile } from '../../lib/file.js'
import { getStagedFiles } from '../../lib/getStagedFiles.js'
import { normalizePath } from '../../lib/normalizePath.js'

vi.mock('../../lib/execGit.js', () => ({
  execGit: vi.fn(async () => ''),
}))

vi.mock('../../lib/file.js', () => ({
  readFile: vi.fn(async () => null),
}))

const normalizeWindowsPath = (input) => normalizePath(path.resolve('/', input))

describe('getStagedFiles', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return array of file names', async ({ expect }) => {
    vi.mocked(execGit).mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js\u0000:000000 100644 0000000 0000000 A\u0000bar.js\u0000'
    )

    const staged = await getStagedFiles({
      cwd: '/',
      gitConfigDir: '/',
    })

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
    vi.mocked(execGit).mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js\u0000:000000 100644 0000000 0000000 A\u0000bar:qux.js\u0000'
    )

    const staged = await getStagedFiles({
      cwd: '/',
      gitConfigDir: '/',
    })

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
    const staged = await getStagedFiles({
      cwd: '/',
      gitConfigDir: '/',
    })
    expect(staged).toEqual([])
  })

  it('should return null in case of error', async ({ expect }) => {
    vi.mocked(execGit).mockImplementationOnce(async () => {
      throw new Error('fatal: not a git repository (or any of the parent directories): .git')
    })

    const staged = await getStagedFiles({
      cwd: '/',
      gitConfigDir: '/',
    })

    expect(staged).toEqual(null)
  })

  it('should support overriding diff trees with ...', async ({ expect }) => {
    vi.mocked(execGit).mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js\u0000:000000 100644 0000000 0000000 A\u0000bar.js\u0000'
    )

    const staged = await getStagedFiles({
      cwd: '/',
      diff: 'main...my-branch',
      gitConfigDir: '/',
    })

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
    vi.mocked(execGit).mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js\u0000:000000 100644 0000000 0000000 A\u0000bar.js\u0000'
    )

    const staged = await getStagedFiles({
      cwd: '/',
      diff: 'main my-branch',
      gitConfigDir: '/',
    })

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
    vi.mocked(execGit).mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js\u0000:000000 100644 0000000 0000000 A\u0000bar.js\u0000'
    )

    const staged = await getStagedFiles({
      cwd: '/',
      diffFilter: 'ACDMRTUXB',
      gitConfigDir: '/',
    })

    expect(staged).toEqual([
      { filepath: normalizeWindowsPath('/foo.js'), status: 'A' },
      { filepath: normalizeWindowsPath('/bar.js'), status: 'A' },
    ])

    expect(execGit).toHaveBeenCalledExactlyOnceWith(
      ['diff', '--diff-filter=ACDMRTUXB', '--staged', '--raw', '-z'],
      { cwd: '/' }
    )
  })

  it('should return only files changed in both HEAD and MERGE_HEAD', async ({ expect }) => {
    // Both foo.js and bar.js in HEAD
    vi.mocked(execGit).mockImplementationOnce(
      async () =>
        ':000000 100644 0000000 0000000 A\u0000foo.js\u0000:000000 100644 0000000 0000000 A\u0000bar.js\u0000'
    )

    // Existence of MERGE_HEAD file is checked
    vi.mocked(readFile).mockResolvedValueOnce('yes') // any truthy value

    // Only foo.js in MERGE_HEAD
    vi.mocked(execGit).mockImplementationOnce(
      async () => ':000000 100644 0000000 0000000 A\u0000foo.js\u0000'
    )

    const staged = await getStagedFiles({
      cwd: '/',
      gitConfigDir: '/',
    })

    expect(staged).toEqual([
      {
        filepath: normalizeWindowsPath('/foo.js'),
        status: 'A',
      },
    ])
  })
})
