import path from 'node:path'

import { beforeEach, describe, it, test, vi } from 'vitest'

import { exec } from '../../lib/exec.js'
import { execGit, GIT_GLOBAL_OPTIONS } from '../../lib/execGit.js'

vi.mock('../../lib/exec.js', () => ({
  exec: vi.fn(),
}))

test('GIT_GLOBAL_OPTIONS', ({ expect }) => {
  expect(GIT_GLOBAL_OPTIONS).toEqual(['-c', 'submodule.recurse=false'])
})

describe('execGit', () => {
  beforeEach(() => {
    vi.mocked(exec).mockReset()
  })

  it('should execute git in a given working copy', async ({ expect }) => {
    const cwd = path.join(process.cwd(), 'test', '__fixtures__')
    await execGit(['init', 'param'], { cwd })
    expect(exec).toHaveBeenCalledExactlyOnceWith('git', [...GIT_GLOBAL_OPTIONS, 'init', 'param'], {
      cwd,
    })
  })
})
