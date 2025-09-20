import { describe, it } from 'vitest'

import { supportsAnsiColors, wrapAnsiColor } from '../../lib/colors.js'

describe('supportsAnsiColors', () => {
  it.for([
    ['NO_COLOR', '', false],
    ['NO_COLOR', '0', false],
    ['NO_COLOR', 'false', false],
    ['FORCE_COLOR', '', true],
    ['FORCE_COLOR', '1', true],
    ['FORCE_COLOR', 'true', true],
    ['FORCE_COLOR', '0', false],
    ['FORCE_COLOR', 'false', false],
    ['FORCE_TTY', '', true],
    ['FORCE_TTY', '1', true],
    ['FORCE_TTY', 'true', true],
    ['FORCE_TTY', '0', false],
    ['FORCE_TTY', 'false', false],
  ])(
    'should return $2 for process.env[$0]=$1',
    ([envVarName, envVarValue, expected], { expect }) => {
      const process = {
        env: { [envVarName]: envVarValue },
      }

      expect(supportsAnsiColors(process)).toBe(expected)
    }
  )

  it('should return true for TTY', ({ expect }) => {
    expect(supportsAnsiColors({}, true)).toBe(true)
  })

  it.for([
    ['CI', '', true],
    ['CI', '1', true],
    ['CI', 'true', true],
    ['TERM', 'dumb', false],
  ])(
    'should return $2 for process.env[$0]=$1',
    ([envVarName, envVarValue, expected], { expect }) => {
      const process = {
        env: { [envVarName]: envVarValue },
      }

      expect(supportsAnsiColors(process)).toBe(expected)
    }
  )

  it('should return true for process.platform === "win32"', ({ expect }) => {
    const process = {
      platform: 'win32',
    }

    expect(supportsAnsiColors(process)).toBe(true)
  })

  it('should return false for non-TTY', ({ expect }) => {
    expect(supportsAnsiColors({}, false)).toBe(false)
  })
})

describe('wrapAnsiColor', () => {
  const RED = '\u001B[0;31m'

  it('should return exact input when color not supported', ({ expect }) => {
    expect(wrapAnsiColor(RED, false)('foobar')).toBe('foobar')
  })

  it('should return wrapped input when color is supported', ({ expect }) => {
    expect(wrapAnsiColor(RED, true)('foobar')).toBe('\u001B[0;31mfoobar\u001B[0m')
  })
})
