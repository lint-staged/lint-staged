import { describe, it, suite } from 'vitest'

import { assertGitVersion, satisfiesVersion } from '../../lib/assertGitVersion.js'

suite('assertGitVersion', () => {
  describe('satisfiesVersion', () => {
    it.for([
      { actual: '1.2.3', expected: '1.2.3', satisfies: true },
      { actual: '1.2.4', expected: '1.2.3', satisfies: true },
      { actual: '1.3.0', expected: '1.2.3', satisfies: true },
      { actual: '2.0.0', expected: '1.2.3', satisfies: true },
      { actual: '1.2.2', expected: '1.2.3', satisfies: false },
      { actual: '1.1.3', expected: '1.2.3', satisfies: false },
      { actual: '0.2.3', expected: '1.2.3', satisfies: false },
    ])(
      'should return $satisfies for $actual against $expected',
      ({ actual, expected, satisfies }, { expect }) => {
        expect(satisfiesVersion(actual, expected)).toBe(satisfies)
      }
    )
  })

  describe('assertGitVersion', () => {
    it('should assert against Git linux version string', ({ expect }) => {
      const gitVersionOutput = `git version 2.53.0`
      expect(assertGitVersion(gitVersionOutput)).toBe(true)
    })

    it('should assert against Git Windows version string', ({ expect }) => {
      const gitVersionOutput = `git version 2.53.0.windows.1`
      expect(assertGitVersion(gitVersionOutput)).toBe(true)
    })

    it('should assert against Git macOS version string with build options', ({ expect }) => {
      const gitVersionOutput = `git version 2.50.1 (Apple Git-155)
cpu: arm64
no commit associated with this build
sizeof-long: 8
sizeof-size_t: 8
shell-path: /bin/sh
feature: fsmonitor--daemon
libcurl: 8.7.1
zlib: 1.2.12
SHA-1: SHA1_DC
SHA-256: SHA256_BLK
`
      expect(assertGitVersion(gitVersionOutput)).toBe(true)
    })

    it('should return false when version number cannot be parsed', ({ expect }) => {
      const gitVersionOutput = undefined
      expect(assertGitVersion(gitVersionOutput)).toBe(false)
    })
  })
})
