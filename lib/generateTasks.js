'use strict'

const micromatch = require('micromatch')
const normalize = require('normalize-path')
const path = require('path')

const debug = require('debug')('lint-staged:gen-tasks')

/**
 * Match the following characters for escaping:
 * @see https://regexr.com/4vt72
 */
const ESCAPE_CHARS = /[|\\{}()^$+*?"'` ]/g

/**
 * Match square brackets due to special case in Windows due to a bug in `minimatch` which `prettier` uses
 * @see https://github.com/isaacs/minimatch/issues/50#issuecomment-258709394
 * @see https://regexr.com/4vt8f
 */
const SQUARE_BRACKET_SPECIAL_CASE = /[[\]]/g

const escapeFilename = file =>
  file.replace(ESCAPE_CHARS, '\\$&').replace(SQUARE_BRACKET_SPECIAL_CASE, '[$&]')

/**
 * Generates all task commands, and filelist
 *
 * @param {object} options
 * @param {Object} [options.config] - Task configuration
 * @param {Object} [options.cwd] - Current working directory
 * @param {boolean} [options.gitDir] - Git root directory
 * @param {boolean} [options.files] - Staged filepaths
 * @param {boolean} [options.relative] - Whether filepaths to should be relative to gitDir
 */
function generateTasks({
  config,
  cwd = process.cwd(),
  escape = false,
  gitDir,
  files,
  relative = false
}) {
  debug('Generating linter tasks')

  const absoluteFiles = files.map(file => normalize(path.resolve(gitDir, file)))
  const relativeFiles = absoluteFiles.map(file => normalize(path.relative(cwd, file)))

  return Object.entries(config).map(([pattern, commands]) => {
    const isParentDirPattern = pattern.startsWith('../')

    const fileList = micromatch(
      relativeFiles
        // Only worry about children of the CWD unless the pattern explicitly
        // specifies that it concerns a parent directory.
        .filter(file => {
          if (isParentDirPattern) return true
          return !file.startsWith('..') && !path.isAbsolute(file)
        }),
      pattern,
      {
        cwd,
        dot: true,
        // If pattern doesn't look like a path, enable `matchBase` to
        // match against filenames in every directory. This makes `*.js`
        // match both `test.js` and `subdirectory/test.js`.
        matchBase: !pattern.includes('/')
      }
    )
      .map(file => (relative ? file : path.resolve(cwd, file)))
      .map(file => normalize(file))
      .map(file => (escape ? escapeFilename(file) : file))

    const task = { pattern, commands, fileList }
    debug('Generated task: \n%O', task)

    return task
  })
}

module.exports = generateTasks

module.exports.escapeFilename = escapeFilename
