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
    await execGit(['init', 'param'], { cwd })
    expect(exec).toHaveBeenCalledExactlyOnceWith('git', [...GIT_GLOBAL_OPTIONS, 'init', 'param'], {
      nodeOptions: {
        cwd,
        stdio: ['ignore'],
      },
    })
  })
})
