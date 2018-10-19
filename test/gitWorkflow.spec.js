/* eslint no-underscore-dangle: 0 */

import path from 'path'
import tmp from 'tmp'
import execa from 'execa'
import gitflow from '../src/gitWorkflow'

jest.mock('execa', () => jest.fn().mockImplementation(() => ({ stdout: 'output' })))
tmp.setGracefulCleanup()

describe('gitWorkflow', () => {
  describe('execGit', () => {
    it('should execute git in cwd if working copy is not specified', async () => {
      await gitflow.execGit(['init', 'param'])
      expect(execa).toHaveBeenCalledWith('git', ['init', 'param'], {
        cwd: path.resolve(process.cwd())
      })
    })

    it('should execute git in a given working copy', async () => {
      await gitflow.execGit(['init', 'param'], { cwd: 'test/__fixtures__' })
      expect(execa).toHaveBeenCalledWith('git', ['init', 'param'], {
        cwd: path.resolve(process.cwd(), 'test', '__fixtures__')
      })
    })

    it('should work with relative paths', async () => {
      await gitflow.execGit(['init', 'param'], {
        cwd: 'test/__fixtures__'
      })
      expect(execa).toHaveBeenCalledWith('git', ['init', 'param'], {
        cwd: path.resolve(process.cwd(), 'test', '__fixtures__')
      })
    })
  })
})
