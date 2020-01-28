import { unlink, readFile } from '../lib/file'

describe('unlink', () => {
  it('should throw when second argument is false and file is not found', async () => {
    await expect(unlink('example', false)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, unlink 'example'"`
    )
  })
})

describe('readFile', () => {
  it('should throw when second argument is false and file is not found', async () => {
    await expect(readFile('example', false)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open 'example'"`
    )
  })
})
