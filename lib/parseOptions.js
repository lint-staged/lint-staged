import { createDebug } from './debug.js'
import { getMaxArgLength } from './getSpawnedTasks.js'

const debugLog = createDebug('lint-staged:parseOptions')

/** @param {import('./index').Options} [options] */
export const parseOptions = ({
  allowEmpty = false,
  color = !!process.stdout.hasColors?.(),
  concurrent = true,
  config: configObject,
  configPath,
  continueOnError = false,
  cwd,
  debug = false,
  diff,
  diffFilter,
  failOnChanges = false,
  hideAll = false,
  hidePartiallyStaged = true,
  hideUnstaged = false,
  maxArgLength = getMaxArgLength(),
  quiet = false,
  relative = false,
  revert,
  stash,
  verbose = false,
} = {}) => {
  // Stashing should be disabled by default when the `diff` option is used
  if (stash === undefined) {
    stash = diff === undefined
  }
  // Default to false when using failOnChanges; cannot revert to original state without stash
  if (revert === undefined) {
    revert = !failOnChanges && !!stash
  }

  if (hideAll) {
    hidePartiallyStaged = false // becomes redundant
    hideUnstaged = false // becomes redundant
  } else if (hideUnstaged) {
    hidePartiallyStaged = false // becomes redundant
  }

  const options = {
    allowEmpty,
    color,
    concurrent,
    configObject,
    configPath,
    continueOnError,
    cwd,
    debug,
    diff,
    diffFilter,
    failOnChanges,
    hideAll,
    hidePartiallyStaged,
    hideUnstaged,
    maxArgLength,
    quiet,
    relative,
    revert,
    stash,
    verbose,
  }

  debugLog('Parsed options: %o', options)

  return options
}
