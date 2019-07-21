/* eslint no-underscore-dangle: 0 */

import path from 'path'
import tmp from 'tmp'
import execa from 'execa'
import execGit from '../src/execGit'

tmp.setGracefulCleanup()

describe('execGit', () => {
  it('should execute git in process.cwd if working copy is not specified', async () => {
    const cwd = process.cwd()
    await execGit(['init', 'param'])
    expect(execa).toHaveBeenCalledWith('git', ['init', 'param'], { cwd })
  })

  it('should execute git in a given working copy', async () => {
    const cwd = path.join(process.cwd(), 'test', '__fixtures__')
    await execGit(['init', 'param'], { cwd })
    expect(execa).toHaveBeenCalledWith('git', ['init', 'param'], { cwd })
  })
})
