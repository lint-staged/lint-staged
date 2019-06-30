'use strict'

const micromatch = require('micromatch')
const path = require('path')

const debug = require('debug')('lint-staged:gen-tasks')

/**
 * Test if `child` path is inside `parent` path
 * https://stackoverflow.com/a/45242825
 *
 * @param {String} parent
 * @param {String} child
 * @returns {Boolean}
 */
const isPathInside = (parent, child) => {
  const relative = path.relative(parent, child)
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

module.exports = async function generateTasks(linters, gitDir, stagedRelFiles) {
  debug('Generating linter tasks')

  const cwd = process.cwd()
  const stagedFiles = stagedRelFiles.map(file => path.resolve(gitDir, file))

  return Object.keys(linters).map(pattern => {
    const isParentDirPattern = pattern.startsWith('../')
    const commands = linters[pattern]

    const fileList = micromatch(
      stagedFiles
        // Only worry about children of the CWD unless the pattern explicitly
        // specifies that it concerns a parent directory.
        .filter(file => isParentDirPattern || isPathInside(cwd, file))
        // Make the paths relative to CWD for filtering
        .map(file => path.relative(cwd, file)),
      pattern,
      {
        // If pattern doesn't look like a path, enable `matchBase` to
        // match against filenames in every directory. This makes `*.js`
        // match both `test.js` and `subdirectory/test.js`.
        matchBase: !pattern.includes('/'),
        dot: true
      }
    ).map(file =>
      // Return absolute path after the filter is run
      path.resolve(cwd, file)
    )

    const task = { pattern, commands, fileList }
    debug('Generated task: \n%O', task)

    return task
  })
}
