const GIT_Z_REGEXP = /\u0000$/ // oxlint-disable-line no-control-regex

/**
 * Return array of strings split from the output of `git <something> -z`.
 * With `-z`, git prints `fileA\u0000fileB\u0000fileC\u0000` so we need to
 * remove the last occurrence of `\u0000` before splitting
 */
export const parseGitZOutput = (input) =>
  input ? input.replace(GIT_Z_REGEXP, '').split('\u0000') : []
