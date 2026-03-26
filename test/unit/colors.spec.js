import { describe, suite, test, vi } from 'vitest'

suite('colors', () => {
  describe('color functions', async () => {
    vi.stubEnv('FORCE_COLOR', '1')
    process.stdout.hasColors = vi.fn().mockReturnValue(true)

    const { red, dim, blue, bold, yellow } = await import('../../lib/colors.js')

    const colors = { red, dim, blue, bold, yellow }

    test.for([
      ['red', '\u001b[31m_\u001b[39m'],
      ['dim', '\u001b[2m_\u001b[22m'],
      ['blue', '\u001b[34m_\u001b[39m'],
      ['bold', '\u001b[1m_\u001b[22m'],
      ['yellow', '\u001b[33m_\u001b[39m'],
    ])("should format '_' in $0 as $1", ([color, expected], { expect }) => {
      expect(colors[color]('_')).toBe(expected)
    })
  })
})
