/** @typedef {import('./index').Logger} Logger */

import fs from 'node:fs/promises'
import path from 'node:path'

import debug from 'debug'
import YAML from 'yaml'

import {
  CONFIG_FILE_NAMES,
  CONFIG_NAME,
  PACKAGE_JSON_FILE,
  PACKAGE_YAML_FILES,
} from './configFiles.js'
import { dynamicImport } from './dynamicImport.js'
import { failedToLoadConfig } from './messages.js'
import { resolveConfig } from './resolveConfig.js'

const debugLog = debug('lint-staged:loadConfig')

const jsonParse = (filePath, content) => {
  const isPackageFile = PACKAGE_JSON_FILE.includes(path.basename(filePath))
  try {
    const json = JSON.parse(content)
    return isPackageFile ? json[CONFIG_NAME] : json
  } catch (error) {
    if (path.basename(filePath) === PACKAGE_JSON_FILE) {
      debugLog('Ignoring invalid package file `%s` with content:\n%s', filePath, content)
      return undefined
    }

    throw error
  }
}

const yamlParse = (filePath, content) => {
  const isPackageFile = PACKAGE_YAML_FILES.includes(path.basename(filePath))
  try {
    const yaml = YAML.parse(content)
    return isPackageFile ? yaml[CONFIG_NAME] : yaml
  } catch (error) {
    if (isPackageFile) {
      debugLog('Ignoring invalid package file `%s` with content:\n%s', filePath, content)
      return undefined
    }

    throw error
  }
}

const NO_EXT = 'noExt'

/**
 * `lilconfig` doesn't support yaml files by default,
 * so we add custom loaders for those. Files without
 * an extensions are assumed to be yaml — this
 * assumption is in `cosmiconfig` as well.
 */
const loaders = {
  [NO_EXT]: yamlParse,
  '.cjs': dynamicImport,
  '.cts': dynamicImport,
  '.js': dynamicImport,
  '.json': jsonParse,
  '.mjs': dynamicImport,
  '.mts': dynamicImport,
  '.ts': dynamicImport,
  '.yaml': yamlParse,
  '.yml': yamlParse,
}

const readFile = async (filepath) => {
  const absolutePath = path.resolve(filepath)
  return fs.readFile(absolutePath, 'utf-8')
}

const loadConfigByExt = async (filepath) => {
  filepath = path.resolve(filepath)
  const ext = path.extname(filepath) || NO_EXT
  const loader = loaders[ext]

  /**
   * No need to read file contents when loader only takes in the filepath argument
   * and reads itself; this is for `lilconfig` compatibility
   */
  const content = loader.length > 1 ? await readFile(filepath) : undefined

  return {
    config: await loader(filepath, content),
    filepath,
  }
}

/**
 * @param {object} options
 * @param {string} [options.configPath] - Explicit path to a config file
 * @param {string} [options.cwd] - Current working directory
 */
export const loadConfig = async ({ configPath, cwd }, logger) => {
  try {
    let result

    if (configPath) {
      debugLog('Loading configuration from `%s`...', configPath)
      result = await loadConfigByExt(resolveConfig(configPath))
    } else {
      debugLog('Searching for configuration from `%s`...', cwd)
      const { lilconfig } = await import('lilconfig')
      const explorer = lilconfig(CONFIG_NAME, { searchPlaces: CONFIG_FILE_NAMES, loaders })
      result = await explorer.search(cwd)
    }

    if (!result) return {}

    // config is a promise when using the `dynamicImport` loader
    const config = (await result.config) ?? null
    const filepath = result.filepath

    debugLog('Successfully loaded config from `%s`:\n%O', filepath, config)

    return { config, filepath }
  } catch (error) {
    debugLog('Failed to load configuration from `%s` with error:\n', configPath, error)
    logger.error(failedToLoadConfig(configPath))
    return {}
  }
}
