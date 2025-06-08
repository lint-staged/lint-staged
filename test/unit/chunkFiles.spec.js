import path from 'node:path'

import { chunkFiles } from '../../lib/chunkFiles.js'
import { normalizePath } from '../../lib/normalizePath.js'

describe('chunkFiles', () => {
  const files = [
    { filepath: 'example.js', status: 'M' },
    { filepath: 'foo.js', status: 'M' },
    { filepath: 'bar.js', status: 'M' },
    { filepath: 'foo/bar.js', status: 'M' },
  ]

  const baseDir = normalizePath('/opt/git/example.git')

  it('should default to sane value', () => {
    const chunkedFiles = chunkFiles({
      baseDir,
      files: [{ filepath: 'foo.js', status: 'M' }],
      relative: true,
    })
    expect(chunkedFiles).toEqual([
      [
        {
          filepath: 'foo.js',
          status: 'M',
        },
      ],
    ])
  })

  it('should not chunk short argument string', () => {
    const chunkedFiles = chunkFiles({ baseDir, files, maxArgLength: 1000, relative: true })
    expect(chunkedFiles).toEqual([files])
  })

  it('should chunk too long argument string', () => {
    const chunkedFiles = chunkFiles({ baseDir, files, maxArgLength: 20, relative: false })
    expect(chunkedFiles).toEqual(
      files.map((file) => [
        {
          filepath: normalizePath(path.resolve(baseDir, file.filepath)),
          status: 'M',
        },
      ])
    )
  })

  it('should take into account relative setting', () => {
    const chunkedFiles = chunkFiles({ baseDir, files, maxArgLength: 20, relative: true })
    expect(chunkedFiles).toEqual([
      [files[0], files[1]],
      [files[2], files[3]],
    ])
  })

  it('should resolve absolute paths by default', () => {
    const chunkedFiles = chunkFiles({ baseDir, files })
    expect(chunkedFiles).toEqual([
      files.map((file) => ({
        filepath: normalizePath(path.resolve(baseDir, file.filepath)),
        status: 'M',
      })),
    ])
  })

  it('should resolve absolute paths by default even when maxArgLength is set', () => {
    const chunkedFiles = chunkFiles({ baseDir, files, maxArgLength: 262144 })
    expect(chunkedFiles).toEqual([
      files.map((file) => ({
        filepath: normalizePath(path.resolve(baseDir, file.filepath)),
        status: 'M',
      })),
    ])
  })
})
