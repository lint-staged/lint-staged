/** @typedef {import('./index').Logger} Logger */

import path from 'node:path'

import debug from 'debug'

import { CONFIG_FILE_NAMES } from './configFiles.js'
import { execGit } from './execGit.js'
import { loadConfig } from './loadConfig.js'
import { normalizePath } from './normalizePath.js'
import { parseGitZOutput } from './parseGitZOutput.js'
import { validateConfig } from './validateConfig.js'

const debugLog = debug('lint-staged:searchConfigs')

const EXEC_GIT = ['ls-files', '-z', '--full-name', '-t']

const CONFIG_PATHSPEC = CONFIG_FILE_NAMES.map((f) => `:(glob)**/${f}`)

const numberOfLevels = (file) => file.split('/').length

const sortDeepestParth = (a, b) => (numberOfLevels(a) > numberOfLevels(b) ? -1 : 1)

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
  { configObject, configPath, cwd = process.cwd(), topLevelDir = cwd },
  logger
) => {
  debugLog('Searching for configuration files...')

  // Return explicit config object from js API
  if (configObject) {
    debugLog('Using single direct configuration object...')

    return { '': validateConfig(configObject, 'config object', logger) }
  }

  // Use only explicit config path instead of discovering multiple
  if (configPath) {
    debugLog('Using single configuration path...')

    const { config, filepath } = await loadConfig({ configPath }, logger)

    if (!config) return {}
    return { [configPath]: validateConfig(config, filepath, logger) }
  }

  /** Get all possible config files from git (both cached and uncommitted) */
  const gitListedFiles = await execGit(
    [
      ...EXEC_GIT,
      '--cached', // show all tracked files
      '--others', // show untracked files
      '--exclude-standard', // apply standard git exclusions (.gitignore, etc.)
      '--',
      ...CONFIG_PATHSPEC,
    ],
    { cwd }
  ).then(parseGitZOutput)

  debugLog('Git listed files matching config files:', gitListedFiles)

  /** Sort possible config files so that deepest is first */
  const possibleConfigFiles = gitListedFiles
    .flatMap((line) => {
      /**
       * Leave out lines starting with "S " to ignore not-checked-out files in a sparse repo.
       * The "S" status means a tracked file that is "skip-worktree"
       * @see https://git-scm.com/docs/git-ls-files#Documentation/git-ls-files.txt--t
       */
      if (line.startsWith('S ')) {
        return []
      }

      const relativePath = line.replace(/^[HSMRCK?U] /, '')
      const absolutePath = normalizePath(path.join(topLevelDir, relativePath))
      return [absolutePath]
    })
    .sort(sortDeepestParth)

  debugLog('Found possible config files:', possibleConfigFiles)

  /** Create object with key as config file, and value as null */
  const configs = possibleConfigFiles.reduce(
    (acc, configPath) => Object.assign(acc, { [configPath]: null }),
    {}
  )

  /** Load and validate all configs to the above object */
  await Promise.all(
    Object.keys(configs).map((configPath) =>
      loadConfig({ configPath }, logger).then(({ config, filepath }) => {
        if (config) {
          if (configPath !== filepath) {
            debugLog('Config file "%s" resolved to "%s"', configPath, filepath)
          }

          configs[configPath] = validateConfig(config, filepath, logger)
        }
      })
    )
  )

  /** Get validated configs from the above object, without any `null` values (not found) */
  const foundConfigs = Object.entries(configs)
    .filter(([, value]) => !!value)
    .reduce((acc, [key, value]) => Object.assign(acc, { [key]: value }), {})

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
