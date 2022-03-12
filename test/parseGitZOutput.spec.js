import { parseGitZOutput } from '../lib/parseGitZOutput'

describe('parseGitZOutput', () => {
  it('should split string from `git -z` control character', () => {
    const input = 'a\u0000b\u0000c'
    expect(parseGitZOutput(input)).toEqual(['a', 'b', 'c'])
  })

  it('should remove trailing `git -z` control character', () => {
    const input = 'a\u0000'
    expect(parseGitZOutput(input)).toEqual(['a'])
  })

  it('should handle empty input', () => {
    const input = ''
    expect(parseGitZOutput(input)).toEqual([])
  })
})
