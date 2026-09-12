import { describe, it } from 'vitest'

import { readFile } from '../../lib/file.js'

describe('readFile', () => {
  it('should not throw by default when file is not found', async ({ expect }) => {
    await expect(readFile('example')).resolves.toBeNull()
  })

  it('should throw when second argument is false and file is not found', async ({ expect }) => {
    await expect(readFile('example', false)).rejects.toThrow('ENOENT')
  })
})
