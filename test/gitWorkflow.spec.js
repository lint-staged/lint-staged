/* eslint no-underscore-dangle: 0 */

import path from 'path'
import tmp from 'tmp'
import execa from 'execa'
import { execGit, gitStashPop } from '../src/gitWorkflow'

tmp.setGracefulCleanup()

describe('gitWorkflow', () => {
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

  describe('gitStashPop', () => {
    it('should throw when workingTree is null', () => {
      expect(gitStashPop()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Trying to restore from stash but could not find working copy stash."`
      )
    })
  })
})
