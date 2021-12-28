import { pathToFileURL } from 'url'

import debug from 'debug'
import { lilconfig } from 'lilconfig'
import YAML from 'yaml'

const debugLog = debug('lint-staged:loadConfig')

/**
 * The list of files `lint-staged` will read configuration
 * from, in the declared order.
 */
const searchPlaces = [
  'package.json',
  '.lintstagedrc',
  '.lintstagedrc.json',
  '.lintstagedrc.yaml',
  '.lintstagedrc.yml',
  '.lintstagedrc.mjs',
  '.lintstagedrc.js',
  '.lintstagedrc.cjs',
  'lint-staged.config.mjs',
  'lint-staged.config.js',
  'lint-staged.config.cjs',
]

/** exported for tests */
export const dynamicImport = (path) => import(pathToFileURL(path)).then((module) => module.default)

const jsonParse = (path, content) => JSON.parse(content)

const yamlParse = (path, content) => YAML.parse(content)

/**
 * `lilconfig` doesn't support yaml files by default,
 * so we add custom loaders for those. Files without
 * an extensions are assumed to be yaml — this
 * assumption is in `cosmiconfig` as well.
 */
const loaders = {
  '.js': dynamicImport,
  '.json': jsonParse,
  '.mjs': dynamicImport,
  '.cjs': dynamicImport,
  '.yaml': yamlParse,
  '.yml': yamlParse,
  noExt: yamlParse,
}

const resolveConfig = (configPath) => {
  try {
    return require.resolve(configPath)
  } catch {
    return configPath
  }
}

/**
 * @param {Object} opts
 * @param {string} [opts.configPath]
 * @param {string} [opt.searchStartPath]
 * @param {Logger} [opts.logger]
 * @returns {Object} `lint-staged` config info
 */
export const loadConfig = async ({ configPath, searchStartPath = process.cwd(), logger }) => {
  try {
    if (configPath) {
      debugLog('Loading configuration from `%s`...', configPath)
    } else {
      debugLog('Searching for configuration...')
    }

    const explorer = lilconfig('lint-staged', { searchPlaces, loaders })

    const result = await (configPath
      ? explorer.load(resolveConfig(configPath))
      : explorer.search(searchStartPath))
    if (!result) return null

    // config is a promise when using the `dynamicImport` loader
    const config = await result.config
    const filepath = result.filepath

    debugLog('Successfully loaded config from `%s`:\n%O', result.filepath, config)

    return {
      filepath,
      config,
    }
  } catch (error) {
    debugLog('Failed to load configuration from `%s`', configPath)
    logger.error(error)
    return null
  }
}
