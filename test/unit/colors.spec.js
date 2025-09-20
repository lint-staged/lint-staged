import { describe, test, vi } from 'vitest'

import { blue, bold, dim, red, yellow } from '../../lib/colors.js'

const colors = {
  red,
  dim,
  blue,
  bold,
  yellow,
}

vi.stubEnv('FORCE_COLOR', 'true')

describe('colors', () => {
  test.for([
    ['red', '\u001b[31m_\u001b[39m'],
    ['dim', '\u001b[2m_\u001b[22m'],
    ['blue', '\u001b[34m_\u001b[39m'],
    ['bold', '\u001b[1m_\u001b[22m'],
    ['yellow', '\u001b[33m_\u001b[39m'],
  ])("should format '_' in $0 as $1", ([color, expected], { expect }) => {
    expect(colors[color]('_')).toEqual(expected)
  })
})
