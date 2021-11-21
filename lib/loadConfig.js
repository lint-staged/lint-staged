import { lilconfig } from 'lilconfig'
import YAML from 'yaml'

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
export const dynamicImport = (path) =>
  import(path)
    .then((module) => module.default)
    .catch((error) => {
      console.error(error)
      throw error
    })

const jsonParse = (path, content) => JSON.parse(content)

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
  '.yaml': YAML.parse,
  '.yml': YAML.parse,
  noExt: YAML.parse,
}

const resolveConfig = (configPath) => {
  try {
    return require.resolve(configPath)
  } catch {
    return configPath
  }
}

/**
 * @param {string} [configPath]
 */
export const loadConfig = async (configPath) => {
  const explorer = lilconfig('lint-staged', { searchPlaces, loaders })
  const result = await (configPath ? explorer.load(resolveConfig(configPath)) : explorer.search())
  if (!result) return null

  const { config, filepath } = result

  // config is a promise when using the `dynamicImport` loader
  return { config: await config, filepath }
}
