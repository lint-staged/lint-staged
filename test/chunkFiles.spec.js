import chunkFiles from '../lib/chunkFiles'

describe('chunkFiles', () => {
  const files = ['example.js', 'foo.js', 'bar.js', 'foo/bar.js']
  const baseDir = '/opt/git/example.git'

  it('should default to sane value', () => {
    const chunkedFiles = chunkFiles({ baseDir, files: ['foo.js'], relative: true })
    expect(chunkedFiles).toEqual([['foo.js']])
  })

  it('should not chunk short argument string', () => {
    const chunkedFiles = chunkFiles({ baseDir, files, maxArgLength: 1000 })
    expect(chunkedFiles).toEqual([files])
  })

  it('should chunk too long argument string', () => {
    const chunkedFiles = chunkFiles({ baseDir, files, maxArgLength: 20 })
    expect(chunkedFiles).toEqual(files.map((file) => [file]))
  })

  it('should take into account relative setting', () => {
    const chunkedFiles = chunkFiles({ baseDir, files, maxArgLength: 20, relative: true })
    expect(chunkedFiles).toEqual([
      [files[0], files[1]],
      [files[2], files[3]],
    ])
  })
})
