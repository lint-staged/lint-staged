import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import { describe, test } from 'vitest'

const execAsync = promisify(exec)

describe('CLI option conflicts', () => {
  test('--all conflicts with --diff', async ({ expect }) => {
    try {
      await execAsync('node bin/lint-staged.js --all --diff="HEAD~1"', { cwd: process.cwd() })
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error.stderr || error.message).toMatch(/--all/)
      expect(error.stderr || error.message).toMatch(/--diff/)
    }
  })

  test('--all conflicts with --diff-filter', async ({ expect }) => {
    try {
      await execAsync('node bin/lint-staged.js --all --diff-filter=A', { cwd: process.cwd() })
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error.stderr || error.message).toMatch(/--all/)
      expect(error.stderr || error.message).toMatch(/--diff-filter/)
    }
  })
})
