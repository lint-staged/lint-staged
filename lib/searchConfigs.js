/** @typedef {import('./index').Logger} Logger */

import { basename, join } from 'path'

import debug from 'debug'
import normalize from 'normalize-path'

import { execGit } from './execGit.js'
import { loadConfig, searchPlaces } from './loadConfig.js'
import { parseGitZOutput } from './parseGitZOutput.js'
import { validateConfig } from './validateConfig.js'

const debugLog = debug('lint-staged:searchConfigs')

const EXEC_GIT = ['ls-files', '-z', '--full-name']

const filterPossibleConfigFiles = (file) => searchPlaces.includes(basename(file))

const numberOfLevels = (file) => file.split('/').length

const sortDeepestParth = (a, b) => (numberOfLevels(a) > numberOfLevels(b) ? -1 : 1)

const isInsideDirectory = (dir) => (file) => file.startsWith(normalize(dir))

export const ConfigObjectSymbol = Symbol()

/**
 * Search all config files from the git repository, preferring those inside `cwd`.
 *
 * @param {object} options
 * @param {Object} [options.configObject] - Explicit config object from the js API
 * @param {string} [options.configPath] - Explicit path to a config file
 * @param {string} [options.cwd] - Current working directory
 * @param {Logger} logger
 *
 * @returns {Promise<{ [key: string]: { config: *, files: string[] } }>} found configs with filepath as key, and config as value
 */
export const searchConfigs = async (
  { configObject, configPath, cwd = process.cwd(), gitDir = cwd },
  logger
) => {
  debugLog('Searching for configuration files...')

  // Return explicit config object from js API
  if (configObject) {
    debugLog('Using single direct configuration object...')

    return { [ConfigObjectSymbol]: validateConfig(configObject, 'config object', logger) }
  }

  // Use only explicit config path instead of discovering multiple
  if (configPath) {
    debugLog('Using single configuration path...')

    const { config, filepath } = await loadConfig({ configPath }, logger)

    if (!config) return {}
    return { [configPath]: validateConfig(config, filepath, logger) }
  }

  /** Get all possible config files known to git */
  const cachedFiles = parseGitZOutput(await execGit(EXEC_GIT, { cwd: gitDir })).filter(
    filterPossibleConfigFiles
  )

  /** Get all possible config files from uncommitted files */
  const otherFiles = parseGitZOutput(
    await execGit([...EXEC_GIT, '--others', '--exclude-standard'], { cwd: gitDir })
  ).filter(filterPossibleConfigFiles)

  /** Sort possible config files so that deepest is first */
  const possibleConfigFiles = [...cachedFiles, ...otherFiles]
    .map((file) => join(gitDir, file))
    .map((file) => normalize(file))
    .filter(isInsideDirectory(cwd))
    .sort(sortDeepestParth)

  debugLog('Found possible config files:', possibleConfigFiles)

  /** Create object with key as config file, and value as null */
  const configs = possibleConfigFiles.reduce(
    (acc, configPath) => Object.assign(acc, { [configPath]: null }),
    {}
  )

  /** Load and validate all configs to the above object */
  await Promise.all(
    possibleConfigFiles
      .map((configPath) => loadConfig({ configPath }, logger))
      .map((promise) =>
        promise.then(({ config, filepath }) => {
          if (config) {
            configs[filepath] = validateConfig(config, filepath, logger)
          }
        })
      )
  )

  /** Get validated configs from the above object, without any `null` values (not found) */
  const foundConfigs = Object.entries(configs)
    .filter(([, value]) => !!value)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

  /**
   * Try to find a single config from parent directories
   * to match old behavior before monorepo support
   */
  if (!Object.keys(foundConfigs).length) {
    debugLog('Could not find config files inside "%s"', cwd)

    const { config, filepath } = await loadConfig({ cwd }, logger)
    if (config) {
      debugLog('Found parent configuration file from "%s"', filepath)

      foundConfigs[filepath] = validateConfig(config, filepath, logger)
    } else {
      debugLog('Could not find parent configuration files from "%s"', cwd)
    }
  }

  debugLog('Found %d config files', Object.keys(foundConfigs).length)

  return foundConfigs
}
