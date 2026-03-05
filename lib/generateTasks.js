import path from 'node:path'

import picomatch from 'picomatch'
import toRegexRange from 'to-regex-range'

import { createDebug } from './debug.js'
import { normalizePath } from './normalizePath.js'

const debugLog = createDebug('lint-staged:generateTasks')

/**
 * @param {*} value
 * @returns {boolean}
 */
const isNumber = (value) => Number.isInteger(Number(value))

const picomatchBaseOptions = {
  dot: true,
  posixSlashes: true,
  strictBrackets: true,
  expandRange: (...ranges) => {
    // Last argument is the options
    const cleanRanges = ranges.slice(0, -1)

    // {1..3..5}
    if (cleanRanges.every((range) => isNumber(range))) {
      cleanRanges.sort((a, b) => Number(a) - Number(b))
      return `(${toRegexRange(cleanRanges.at(0), cleanRanges.at(-1))})`
    }

    // {ab..cd}
    if (cleanRanges.some((range) => range.length > 1)) {
      throw new RangeError(`Invalid ranges: ${cleanRanges}`)
    }

    cleanRanges.sort()

    // {a..f}
    return `([${cleanRanges.at(0)}-${cleanRanges.at(-1)}])`
  },
}

/**
 * Generates all task commands, and filelist
 *
 * @param {object} options
 * @param {Object} [options.config] - Task configuration
 * @param {Object} [options.cwd] - Current working directory
 * @param {import('./getStagedFiles.js').StagedFile[]} [options.files] - Staged filepaths
 * @param {boolean} [options.relative] - Whether filepaths to should be relative to cwd
 */
export const generateTasks = ({ config, cwd = process.cwd(), files, relative = false }) => {
  debugLog('Generating linter tasks')

  /** @type {StagedFile[]} */
  const relativeFiles = files.map((file) => ({
    filepath: normalizePath(path.relative(cwd, file.filepath)),
    status: file.status,
  }))

  return Object.entries(config).map(([pattern, commands]) => {
    const isParentDirPattern = pattern.startsWith('../')

    // Only worry about children of the CWD unless the pattern explicitly
    // specifies that it concerns a parent directory.
    const filteredFiles = relativeFiles.filter((file) => {
      if (isParentDirPattern) return true
      return !file.filepath.startsWith('..') && !path.isAbsolute(file.filepath)
    })

    const isMatch = picomatch(pattern, {
      cwd,
      ...picomatchBaseOptions,
      // If the pattern doesn't look like a path, enable `matchBase` to
      // match against filenames in every directory. This makes `*.js`
      // match both `test.js` and `subdirectory/test.js`.
      matchBase: !pattern.includes('/'),
    })

    const matches = filteredFiles.map((file) => file.filepath).filter((file) => isMatch(file))

    const fileList = filteredFiles.flatMap((file) =>
      matches.includes(file.filepath)
        ? [
            {
              filepath: normalizePath(relative ? file.filepath : path.resolve(cwd, file.filepath)),
              status: file.status,
            },
          ]
        : []
    )

    const task = { pattern, commands, fileList }
    debugLog('Generated task: \n%O', task)

    return task
  })
}
