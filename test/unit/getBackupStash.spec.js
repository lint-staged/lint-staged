import crypto from 'node:crypto'

import makeConsoleMock from 'consolemock'
import { describe, it, vi } from 'vitest'

import { getInitialState } from '../../lib/state.js'
import { GetBackupStashError } from '../../lib/symbols'

vi.mock('../../lib/execGit.js', () => ({
  execGit: vi.fn(async () => {
    /** Mock fails by default */
    return ''
  }),
}))

const { execGit } = await import('../../lib/execGit.js')
const { GitWorkflow } = await import('../../lib/gitWorkflow.js')

describe('gitWorkflow', () => {
  const options = { logger: makeConsoleMock(), gitConfigDir: '.' }

  describe('getBackupStash', () => {
    it('should throw when stash not found', async ({ expect }) => {
      const gitWorkflow = new GitWorkflow(options)
      const ctx = getInitialState()

      await expect(gitWorkflow.getBackupStash(ctx)).rejects.toThrow(
        'lint-staged automatic backup is missing!'
      )

      expect(ctx.errors.has(GetBackupStashError)).toEqual(true)
    })

    it('should throw when stash not found even when other stashes are', async ({ expect }) => {
      const gitWorkflow = new GitWorkflow(options)
      const ctx = getInitialState()
      ctx.backupHash = 'not-found'

      execGit.mockResolvedValueOnce(
        `"deadbeef On main: lint-staged automatic backup (${crypto.randomBytes(4).toString('hex')})"`
      )

      await expect(gitWorkflow.getBackupStash(ctx)).rejects.toThrow(
        'lint-staged automatic backup is missing!'
      )

      expect(ctx.errors.has(GetBackupStashError)).toEqual(true)
    })

    it('should return ref to the backup stash', async ({ expect }) => {
      const gitWorkflow = new GitWorkflow(options)
      const ctx = getInitialState()
      ctx.backupHash = 'abc123'

      execGit.mockResolvedValueOnce(
        [
          '"deadbeef On main: some random stuff"',
          `"${ctx.backupHash} on main: lint-staged automatic backup (${crypto.randomBytes(4).toString('hex')})"`,
          '"hash1234 On main: other random stuff"',
        ].join('\u0000')
      )

      await expect(gitWorkflow.getBackupStash(ctx)).resolves.toEqual('1')
    })
  })
})
