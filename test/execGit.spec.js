import path from 'path'

import { execa } from 'execa'

import { execGit, GIT_GLOBAL_OPTIONS } from '../lib/execGit'

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
