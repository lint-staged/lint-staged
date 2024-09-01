import { readFile, unlink } from '../../lib/file.js'

describe('unlink', () => {
  it('should throw when second argument is false and file is not found', async () => {
    await expect(unlink('example', false)).rejects.toThrow('ENOENT')
  })
})

describe('readFile', () => {
  it('should throw when second argument is false and file is not found', async () => {
    await expect(readFile('example', false)).rejects.toThrow('ENOENT')
  })
})
