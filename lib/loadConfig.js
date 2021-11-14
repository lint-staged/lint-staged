import { cosmiconfig } from 'cosmiconfig'

const dynamicImport = (path) => import(path).then((module) => module.default)

const jsonParse = (path, content) => JSON.parse(content)

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
export const loadConfig = (configPath) => {
  const explorer = cosmiconfig('lint-staged', {
    searchPlaces: [
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
    ],
    loaders: {
      '.cjs': dynamicImport,
      '.js': dynamicImport,
      '.json': jsonParse,
      '.mjs': dynamicImport,
    },
  })

  return configPath ? explorer.load(resolveConfig(configPath)) : explorer.search()
}
