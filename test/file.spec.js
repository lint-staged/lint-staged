import { unlink, readFile } from '../lib/file'

describe('unlink', () => {
  it('should throw when second argument is false and file is not found', async () => {
    await expect(unlink('example', false)).rejects.toThrowError()
  })
})

describe('readFile', () => {
  it('should throw when second argument is false and file is not found', async () => {
    await expect(readFile('example', false)).rejects.toThrowError()
  })
})
