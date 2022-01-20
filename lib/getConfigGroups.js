/** @typedef {import('./index').Logger} Logger */

import path from 'path'

import { loadConfig } from './loadConfig.js'
import { ConfigNotFoundError } from './symbols.js'
import { validateConfig } from './validateConfig.js'

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
  // Return explicit config object from js API
  if (configObject) {
    const config = validateConfig(configObject, 'config object', logger)
    return { '': { config, files } }
  }

  // Use only explicit config path instead of discovering multiple
  if (configPath) {
    const { config, filepath } = await loadConfig({ configPath }, logger)

    if (!config) {
      logger.error(`${ConfigNotFoundError.message}.`)
      throw ConfigNotFoundError
    }

    const validatedConfig = validateConfig(config, filepath, logger)
    return { [configPath]: { config: validatedConfig, files } }
  }

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

  // Group files by their discovered config
  // { '.lintstagedrc.json': { config: {...}, files: [...] } }
  const configGroups = {}

  const searchConfig = async (cwd, files = []) => {
    const { config, filepath } = await loadConfig({ cwd }, logger)
    if (!config) return

    if (filepath in configGroups) {
      // Re-use cached config and skip validation
      configGroups[filepath].files.push(...files)
    } else {
      const validatedConfig = validateConfig(config, filepath, logger)
      configGroups[filepath] = { config: validatedConfig, files }
    }
  }

  // Start by searching from cwd
  await searchConfig(cwd)

  // Discover configs from the base directory of each file
  await Promise.all(Object.entries(filesByDir).map(([dir, files]) => searchConfig(dir, files)))

  // Throw if no configurations were found
  if (Object.keys(configGroups).length === 0) {
    logger.error(`${ConfigNotFoundError.message}.`)
    throw ConfigNotFoundError
  }

  return configGroups
}
