import { describe, test, vi } from 'vitest'

import { blackBright, blue, bold, red, yellow } from '../../lib/colors.js'

const colors = {
  red,
  blackBright,
  blue,
  bold,
  yellow,
}

vi.stubEnv('FORCE_COLOR', 'true')

describe('colors', () => {
  test.for([
    ['red', '\u001b[31m_\u001b[39m'],
    ['blackBright', '\u001b[90m_\u001b[39m'],
    ['blue', '\u001b[34m_\u001b[39m'],
    ['bold', '\u001b[1m_\u001b[22m'],
    ['yellow', '\u001b[33m_\u001b[39m'],
  ])("should format '_' in $0 as $1", ([color, expected], { expect }) => {
    expect(colors[color]('_')).toEqual(expected)
  })
})
