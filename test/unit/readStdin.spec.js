import { stdin } from 'mock-stdin'

import { readStdin } from '../../lib/readStdin.js'

const mockStdin = stdin()

describe('readStdin', () => {
  it('should return stdin', async () => {
    const stdinPromise = readStdin()

    mockStdin.send('Hello, world!')
    mockStdin.end()

    expect(await stdinPromise).toEqual('Hello, world!')
  })
})
