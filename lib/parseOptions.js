import { createDebug } from './debug.js'
import { getMaxArgLength } from './getSpawnedTasks.js'

const debugLog = createDebug('lint-staged:parseOptions')

/** @param {import('./index').Options} [options] */
export const parseOptions = ({
  all,
  allowEmpty,
  color,
  concurrent,
  config: configObject,
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
} = {}) => {
  if (all) {
    // Disable stashing by default when including all files
    stash ??= false
    // Do not fail when there are no changes by default when including all files
    allowEmpty ??= true
  }

  if (hideAll) {
    hidePartiallyStaged = false // becomes redundant
    hideUnstaged = false // becomes redundant
  } else if (hideUnstaged) {
    hidePartiallyStaged = false // becomes redundant
  }

  // Set defaults after implications
  all ??= false
  allowEmpty ??= false
  color ??= !!process.stdout.hasColors?.()
  concurrent ??= true
  continueOnError ??= false
  debug ??= false
  failOnChanges ??= false
  hideAll ??= false
  hideUnstaged ??= false
  hidePartiallyStaged ??= true
  maxArgLength ??= getMaxArgLength()
  quiet ??= false
  relative ??= false
  stash ??= diff === undefined
  revert ??= !failOnChanges && !!stash
  verbose ??= false

  const options = {
    all,
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
