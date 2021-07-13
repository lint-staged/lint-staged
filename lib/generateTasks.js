'use strict'

const micromatch = require('micromatch')
const normalize = require('normalize-path')
const path = require('path')

const debug = require('debug')('lint-staged:gen-tasks')

const { incorrectBraces } = require('./messages')

// Braces with a single value like `*.{js}` are invalid
// and thus ignored by micromatch. This regex matches all occurrences of
// two curly braces without a `,` or `..` between them, to make sure
// users can still accidentally use them without
// some linters never matching anything.
//
// For example `.{js,ts}` or `file_{1..10}` are valid but `*.{js}` is not.
//
// See: https://www.gnu.org/software/bash/manual/html_node/Brace-Expansion.html
const BRACES_REGEXP = /({)(?:(?!,|\.\.).)*?(})/g

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
const generateTasks = (
  { config, cwd = process.cwd(), gitDir, files, relative = false },
  logger
) => {
  debug('Generating linter tasks')

  const absoluteFiles = files.map((file) => normalize(path.resolve(gitDir, file)))
  const relativeFiles = absoluteFiles.map((file) => normalize(path.relative(cwd, file)))

  return Object.entries(config).map(([rawPattern, commands]) => {
    let pattern = rawPattern

    const isParentDirPattern = pattern.startsWith('../')

    // Only worry about children of the CWD unless the pattern explicitly
    // specifies that it concerns a parent directory.
    const filteredFiles = relativeFiles.filter((file) => {
      if (isParentDirPattern) return true
      return !file.startsWith('..') && !path.isAbsolute(file)
    })

    // Remove "extra" brackets when they contain only a single value
    let hadIncorrectBraces = false
    while (BRACES_REGEXP.exec(rawPattern)) {
      hadIncorrectBraces = true
      pattern = pattern.replace(/{/, '')
      pattern = pattern.replace(/}/, '')
    }

    // Warn the user about incorrect brackets usage
    if (hadIncorrectBraces) {
      logger.warn(incorrectBraces(rawPattern, pattern))
    }

    const matches = micromatch(filteredFiles, pattern, {
      cwd,
      dot: true,
      // If the pattern doesn't look like a path, enable `matchBase` to
      // match against filenames in every directory. This makes `*.js`
      // match both `test.js` and `subdirectory/test.js`.
      matchBase: !pattern.includes('/'),
      strictBrackets: true,
    })

    const fileList = matches.map((file) => normalize(relative ? file : path.resolve(cwd, file)))

    const task = { pattern, commands, fileList }
    debug('Generated task: \n%O', task)

    return task
  })
}

module.exports = generateTasks
