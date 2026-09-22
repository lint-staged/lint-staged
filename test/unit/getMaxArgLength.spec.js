import { describe, it } from 'vitest'

import { getMaxArgLength } from '../../lib/getMaxArgLength.js'

describe('getMaxArgLength', () => {
  it.for([
    ['darwin', 262_144],
    ['win32', 8_191],
    ['linux', 131_072],
    ['foobar', 131_072],
  ])('should return $2 for $1', ([platform, expected], { expect }) => {
    expect(getMaxArgLength(platform)).toEqual(expected)
  })
})
