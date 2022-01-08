import path from 'path'

import { jest } from '@jest/globals'

jest.unstable_mockModule('execa', () => ({
  execa: jest.fn(async () => ({
    stdout: 'a-ok',
    stderr: '',
    code: 0,
    cmd: 'mock cmd',
    failed: false,
    killed: false,
    signal: null,
  })),
}))

const { execa } = await import('execa')
const { execGit, GIT_GLOBAL_OPTIONS } = await import('../lib/execGit')

test('GIT_GLOBAL_OPTIONS', () => {
  expect(GIT_GLOBAL_OPTIONS).toMatchInlineSnapshot(`
    Array [
      "-c",
      "submodule.recurse=false",
    ]
  `)
})

describe('execGit', () => {
  it('should execute git in process.cwd if working copy is not specified', async () => {
    const cwd = process.cwd()
    await execGit(['init', 'param'])
    expect(execa).toHaveBeenCalledWith('git', [...GIT_GLOBAL_OPTIONS, 'init', 'param'], {
      all: true,
      cwd,
    })
  })

  it('should execute git in a given working copy', async () => {
    const cwd = path.join(process.cwd(), 'test', '__fixtures__')
    await execGit(['init', 'param'], { cwd })
    expect(execa).toHaveBeenCalledWith('git', [...GIT_GLOBAL_OPTIONS, 'init', 'param'], {
      all: true,
      cwd,
    })
  })
})
