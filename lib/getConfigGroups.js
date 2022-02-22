/** @typedef {import('./index').Logger} Logger */

import path from 'path'

import debug from 'debug'
import objectInspect from 'object-inspect'

import { loadConfig } from './loadConfig.js'
import { ConfigNotFoundError } from './symbols.js'
import { validateConfig } from './validateConfig.js'

const debugLog = debug('lint-staged:getConfigGroups')

/**
 * Return matched files grouped by their configuration.
 *
 * @param {object} options
 * @param {Object} [options.configObject] - Explicit config object from the js API
 * @param {string} [options.configPath] - Explicit path to a config file
 * @param {string} [options.cwd] - Current working directory
 * @param {string} [options.files] - List of staged files
 * @param {Logger} logger
 */
export const getConfigGroups = async (
  { configObject, configPath, cwd, files },
  logger = console
) => {
  debugLog('Grouping configuration files...')

  // Return explicit config object from js API
  if (configObject) {
    debugLog('Using single direct configuration object...')

    const config = validateConfig(configObject, 'config object', logger)
    return { '': { config, files } }
  }

  // Use only explicit config path instead of discovering multiple
  if (configPath) {
    debugLog('Using single configuration path...')

    const { config, filepath } = await loadConfig({ configPath }, logger)

    if (!config) {
      logger.error(`${ConfigNotFoundError.message}.`)
      throw ConfigNotFoundError
    }

    const validatedConfig = validateConfig(config, filepath, logger)
    return { [configPath]: { config: validatedConfig, files } }
  }

  debugLog('Grouping staged files by their directories...')

  // Group files by their base directory
  const filesByDir = files.reduce((acc, file) => {
    const dir = path.normalize(path.dirname(file))

    if (dir in acc) {
      acc[dir].push(file)
    } else {
      acc[dir] = [file]
    }

    return acc
  }, {})

  debugLog('Grouped staged files into %d directories:', Object.keys(filesByDir).length)
  debugLog(objectInspect(filesByDir, { indent: 2 }))

  // Group files by their discovered config
  // { '.lintstagedrc.json': { config: {...}, files: [...] } }
  const configGroups = {}

  debugLog('Searching config files...')

  const searchConfig = async (cwd, files = []) => {
    const { config, filepath } = await loadConfig({ cwd }, logger)
    if (!config) {
      debugLog('Found no config from "%s"!', cwd)
      return
    }

    if (filepath in configGroups) {
      debugLog('Found existing config "%s" from "%s"!', filepath, cwd)
      // Re-use cached config and skip validation
      configGroups[filepath].files.push(...files)
    } else {
      debugLog('Found new config "%s" from "%s"!', filepath, cwd)

      const validatedConfig = validateConfig(config, filepath, logger)
      configGroups[filepath] = { config: validatedConfig, files }
    }
  }

  // Start by searching from cwd
  await searchConfig(cwd)

  // Discover configs from the base directory of each file
  await Promise.all(Object.entries(filesByDir).map(([dir, files]) => searchConfig(dir, files)))

  debugLog('Grouped staged files into %d groups!', Object.keys(configGroups).length)

  return configGroups
}
