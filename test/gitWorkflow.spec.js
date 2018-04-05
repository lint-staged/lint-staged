/* eslint no-underscore-dangle: 0 */

import path from 'path'
import tmp from 'tmp'
import execa from 'execa'
import gitflow from '../src/gitWorkflow'

jest.mock('execa', () => jest.fn().mockImplementation(() => ({ stdout: 'output' })))
tmp.setGracefulCleanup()

describe('gitWorkflow', () => {
  describe('getCmdArgs', () => {
    it('should return empty Array if not specified', () => {
      expect(gitflow.getCmdArgs()).toEqual([])
    })
    it('should return an Array with --git-dir if specified', () => {
      const tmpDir = tmp.dirSync()
      expect(gitflow.getCmdArgs(tmpDir.name)).toEqual(['--git-dir', tmpDir.name])
      tmpDir.removeCallback()
    })
    it('should work with relative paths', () => {
      expect(gitflow.getCmdArgs(path.join('.', 'test'))).toEqual([
        '--git-dir',
        path.resolve(process.cwd(), 'test')
      ])
    })
  })

  describe('execGit', () => {
    beforeEach(() => {
      // execa.mockReset()
    })

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

    it('should execute git with a given gitDir', async () => {
      await gitflow.execGit(['init', 'param'], {
        gitDir: path.resolve('..')
      })
      expect(execa).toHaveBeenCalledWith(
        'git',
        ['--git-dir', path.resolve(process.cwd(), '..'), 'init', 'param'],
        { cwd: path.resolve(process.cwd()) }
      )
    })

    it('should work with relative paths', async () => {
      await gitflow.execGit(['init', 'param'], {
        gitDir: '..',
        cwd: 'test/__fixtures__'
      })
      expect(execa).toHaveBeenCalledWith(
        'git',
        ['--git-dir', path.resolve(process.cwd(), '..'), 'init', 'param'],
        { cwd: path.resolve(process.cwd(), 'test', '__fixtures__') }
      )
    })

    it('should return result from stdout', async () => {
      const res = await gitflow.execGit(['branch', '--list'])
      expect(res).toMatchSnapshot()
    })
  })
})
