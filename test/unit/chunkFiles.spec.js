import path from 'node:path'

import { chunkFiles } from '../../lib/chunkFiles.js'
import { normalizePath } from '../../lib/normalizePath.js'

describe('chunkFiles', () => {
  const files = ['example.js', 'foo.js', 'bar.js', 'foo/bar.js']
  const baseDir = normalizePath('/opt/git/example.git')

  it('should default to sane value', () => {
    const chunkedFiles = chunkFiles({ baseDir, files: ['foo.js'], relative: true })
    expect(chunkedFiles).toEqual([['foo.js']])
  })

  it('should not chunk short argument string', () => {
    const chunkedFiles = chunkFiles({ baseDir, files, maxArgLength: 1000, relative: true })
    expect(chunkedFiles).toEqual([files])
  })

  it('should chunk too long argument string', () => {
    const chunkedFiles = chunkFiles({ baseDir, files, maxArgLength: 20, relative: false })
    expect(chunkedFiles).toEqual(files.map((file) => [normalizePath(path.resolve(baseDir, file))]))
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
    expect(chunkedFiles).toEqual([files.map((file) => normalizePath(path.resolve(baseDir, file)))])
  })

  it('should resolve absolute paths by default even when maxArgLength is set', () => {
    const chunkedFiles = chunkFiles({ baseDir, files, maxArgLength: 262144 })
    expect(chunkedFiles).toEqual([files.map((file) => normalizePath(path.resolve(baseDir, file)))])
  })
})
