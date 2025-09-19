import { stdin } from 'mock-stdin'
import { describe, it } from 'vitest'

import { readStdin } from '../../lib/readStdin.js'

const mockStdin = stdin()

describe('readStdin', () => {
  it('should return stdin', async ({ expect }) => {
    const stdinPromise = readStdin()

    mockStdin.send('Hello, world!')
    mockStdin.end()

    expect(await stdinPromise).toEqual('Hello, world!')
  })
})
