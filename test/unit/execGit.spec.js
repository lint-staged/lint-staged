import path from 'node:path'

import { jest } from '@jest/globals'

jest.unstable_mockModule('../../lib/exec.js', () => ({
  exec: jest.fn().mockResolvedValue(''),
}))

const { exec } = await import('../../lib/exec.js')
const { execGit, GIT_GLOBAL_OPTIONS } = await import('../../lib/execGit.js')

test('GIT_GLOBAL_OPTIONS', () => {
  expect(GIT_GLOBAL_OPTIONS).toMatchInlineSnapshot(`
    [
      "-c",
      "submodule.recurse=false",
    ]
  `)
})

describe('execGit', () => {
  it('should execute git in process.cwd if working copy is not specified', async () => {
    await execGit(['init', 'param'])
    expect(exec).toHaveBeenCalledWith('git', [...GIT_GLOBAL_OPTIONS, 'init', 'param'], {
      cwd: undefined,
    })
  })

  it('should execute git in a given working copy', async () => {
    const cwd = path.join(process.cwd(), 'test', '__fixtures__')
    await execGit(['init', 'param'], { cwd })
    expect(exec).toHaveBeenCalledWith('git', [...GIT_GLOBAL_OPTIONS, 'init', 'param'], {
      cwd,
    })
  })
})
