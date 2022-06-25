import { execGit } from '../../lib/execGit.js'
import { GitWorkflow, STASH } from '../../lib/gitWorkflow.js'
import { getInitialState } from '../../lib/state.js'
import { GetBackupStashError } from '../../lib/symbols'

jest.mock('../../lib/execGit.js', () => ({
  execGit: jest.fn(async () => ''),
}))

describe('gitWorkflow', () => {
  const options = { gitConfigDir: '.' }

  describe('getBackupStash', () => {
    it('should throw when stash not found', async () => {
      const gitWorkflow = new GitWorkflow(options)
      const ctx = getInitialState()

      await expect(gitWorkflow.getBackupStash(ctx)).rejects.toThrowError(
        'lint-staged automatic backup is missing!'
      )

      expect(ctx.errors.has(GetBackupStashError)).toEqual(true)
    })

    it('should throw when stash not found even when other stashes are', async () => {
      const gitWorkflow = new GitWorkflow(options)
      const ctx = getInitialState()

      execGit.mockResolvedValueOnce('stash@{0}: some random stuff')

      await expect(gitWorkflow.getBackupStash(ctx)).rejects.toThrowError(
        'lint-staged automatic backup is missing!'
      )

      expect(ctx.errors.has(GetBackupStashError)).toEqual(true)
    })

    it('should return ref to the backup stash', async () => {
      const gitWorkflow = new GitWorkflow(options)
      const ctx = getInitialState()

      execGit.mockResolvedValueOnce(
        [
          'stash@{0}: some random stuff',
          `stash@{1}: ${STASH}`,
          'stash@{2}: other random stuff',
        ].join('\n')
      )

      await expect(gitWorkflow.getBackupStash(ctx)).resolves.toEqual('refs/stash@{1}')
    })

    it('should return unescaped ref to the backup stash when using MSYS2 without login shell', async () => {
      const gitWorkflow = new GitWorkflow(options)
      const ctx = getInitialState()

      process.env.MSYSTEM = 'MSYS'

      execGit.mockResolvedValueOnce(
        [
          'stash@{0}: some random stuff',
          `stash@{1}: ${STASH}`,
          'stash@{2}: other random stuff',
        ].join('\n')
      )

      await expect(gitWorkflow.getBackupStash(ctx)).resolves.toEqual('refs/stash@{1}')

      delete process.env.MSYSTEM
    })

    it('should return escaped ref to the backup stash when using MSYS2 with login shell', async () => {
      const gitWorkflow = new GitWorkflow(options)
      const ctx = getInitialState()

      process.env.MSYSTEM = 'MSYS'
      process.env.LOGINSHELL = 'bash'

      execGit.mockResolvedValueOnce(
        [
          'stash@{0}: some random stuff',
          `stash@{1}: ${STASH}`,
          'stash@{2}: other random stuff',
        ].join('\n')
      )

      await expect(gitWorkflow.getBackupStash(ctx)).resolves.toEqual('refs/stash@\\{1\\}')

      delete process.env.MSYSTEM
      delete process.env.LOGINSHELL
    })
  })
})
