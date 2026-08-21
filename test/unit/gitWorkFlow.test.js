import makeConsoleMock from 'consolemock'
import { describe, it, vi } from 'vitest'

import { GitWorkflow } from '../../lib/gitWorkflow.js'
import { getInitialState } from '../../lib/state.js'
import { GitError } from '../../lib/symbols.js'

vi.mock('tinyexec', () => ({
  exec: vi.fn(() => Promise.reject()),
}))

describe('gitWorkflow', () => {
  describe('cleanup', () => {
    it('should handle errors', async ({ expect }) => {
      const gitWorkflow = new GitWorkflow({
        logger: makeConsoleMock(),
        topLevelDir: '/',
        gitConfigDir: '/',
      })

      const ctx = getInitialState()

      await gitWorkflow.cleanup(ctx)

      expect(ctx.errors).toBeInstanceOf(Set)
      expect(ctx.errors.has(GitError)).toBe(true)
    })
  })
})
