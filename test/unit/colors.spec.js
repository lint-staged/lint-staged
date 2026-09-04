import { PassThrough } from 'node:stream'

import { afterEach, describe, suite, test, vi } from 'vitest'

import {
  enableColors,
  supportsColors,
  green,
  red,
  dim,
  blue,
  bold,
  yellow,
} from '../../lib/colors.js'

suite('colors', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('supports FORCE_COLOR without a TTY', ({ expect }) => {
    const stream = new PassThrough()
    Object.defineProperty(stream, 'isTTY', { value: false })

    vi.stubEnv('NO_COLOR', undefined)
    vi.stubEnv('FORCE_COLOR', '1')

    expect(stream.isTTY).toBe(false)
    expect(stream.hasColors).toBeUndefined()
    expect(supportsColors(stream)).toBe(true)
  })

  test('supports NO_COLOR', ({ expect }) => {
    vi.stubEnv('NO_COLOR', '1')

    expect(supportsColors()).toBe(false)
  })

  describe('color functions', async () => {
    enableColors(true)

    const colors = { green, red, dim, blue, bold, yellow }

    test.for([
      ['green', '\u001b[32m_\u001b[39m'],
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
