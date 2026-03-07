import path from 'node:path'

import { exec } from 'tinyexec'
import { beforeEach, describe, it, test, vi } from 'vitest'

import { execGit, GIT_GLOBAL_OPTIONS } from '../../lib/execGit.js'

vi.mock('tinyexec', () => ({
  exec: vi.fn().mockReturnValue({
    async *[Symbol.asyncIterator]() {
      yield 'test'
    },
  }),
}))

test('GIT_GLOBAL_OPTIONS', ({ expect }) => {
  expect(GIT_GLOBAL_OPTIONS).toEqual(['-c', 'submodule.recurse=false'])
})

describe('execGit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should execute git in a given working copy', async ({ expect }) => {
    const cwd = path.join(process.cwd(), 'test', '__fixtures__')
    const output = await execGit(['init', 'param'], { cwd })
    expect(exec).toHaveBeenCalledExactlyOnceWith('git', [...GIT_GLOBAL_OPTIONS, 'init', 'param'], {
      nodeOptions: {
        cwd,
        stdio: ['ignore'],
      },
    })

    expect(output).toBe('test')
  })

  it('should strip Git CRLF warning from start of output', async ({ expect }) => {
    vi.mocked(exec).mockReturnValueOnce({
      async *[Symbol.asyncIterator]() {
        yield "warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it"
        yield '09756bc72fde5a4c77ff788ad49fa1c1111a8527'
      },
    })

    const output = await execGit(['stash', 'create'])

    expect(output).toBe('09756bc72fde5a4c77ff788ad49fa1c1111a8527')
  })
})
