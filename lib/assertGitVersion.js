/** @see {@link https://github.com/git/git/blob/master/Documentation/RelNotes/2.27.0.adoc} */
export const MIN_GIT_VERSION = '2.27.0'

/**
 * @param {string} gitVersionOutput the Git version command output
 * @returns {string} the Git version number in format `<major>.<minor>.<patch>`
 */
const extractGitVersionNumber = (gitVersionOutput) => {
  const match = gitVersionOutput.match(/git version\s+(\d+\.\d+\.\d+)/i)
  return match?.[1]
}

/**
 * @param {string} version the version number in format `<major>.<minor>.<patch>`
 * @returns {[string, string, string]} the version number parsed as integers `[major, minor, patch]`
 */
const parseSemver = (version) => {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(version)
  return match?.slice(1, 4).map(Number)
}

/**
 *
 * @param {string} actual the actual version number in format `<major>.<minor>.<patch>`
 * @param {string} expected the expected version number in format `<major>.<minor>.<patch>`
 * @returns {boolean} `true` when the actual version number is at least the expected version number
 */
export const satisfiesVersion = (actual, expected) => {
  const a = parseSemver(actual)
  const e = parseSemver(expected)
  if (a[0] !== e[0]) return a[0] > e[0]
  if (a[1] !== e[1]) return a[1] > e[1]
  return a[2] >= e[2]
}

/**
 *
 * @param {string} gitVersionOutput the Git version command output
 * @returns {boolean} `true` when the Git version number is supported
 */
export const assertGitVersion = (gitVersionOutput) => {
  try {
    const version = extractGitVersionNumber(gitVersionOutput)
    return satisfiesVersion(version, MIN_GIT_VERSION)
  } catch {
    return false
  }
}
