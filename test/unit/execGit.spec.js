import path from 'node:path'

import { beforeEach, describe, it, test } from 'vitest'

import { getMockNanoSpawn } from './__utils__/getMockNanoSpawn.js'

const { default: spawn } = await getMockNanoSpawn()

const { execGit, GIT_GLOBAL_OPTIONS } = await import('../../lib/execGit.js')

test('GIT_GLOBAL_OPTIONS', ({ expect }) => {
  expect(GIT_GLOBAL_OPTIONS).toEqual(['-c', 'submodule.recurse=false'])
})

describe('execGit', () => {
  beforeEach(() => {
    spawn.mockReset()
  })

  it('should execute git in process.cwd if working copy is not specified', async ({ expect }) => {
    const cwd = process.cwd()
    await execGit(['init', 'param'])
    expect(spawn).toHaveBeenCalledExactlyOnceWith('git', [...GIT_GLOBAL_OPTIONS, 'init', 'param'], {
      cwd,
      stdin: 'ignore',
    })
  })

  it('should execute git in a given working copy', async ({ expect }) => {
    const cwd = path.join(process.cwd(), 'test', '__fixtures__')
    await execGit(['init', 'param'], { cwd })
    expect(spawn).toHaveBeenCalledExactlyOnceWith('git', [...GIT_GLOBAL_OPTIONS, 'init', 'param'], {
      cwd,
      stdin: 'ignore',
    })
  })
})
