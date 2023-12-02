export const CONFIG_NAME = 'lint-staged'

export const PACKAGE_JSON_FILE = 'package.json'

export const PACKAGE_YAML_FILES = ['package.yaml', 'package.yml']

/**
 * The list of files `lint-staged` will read configuration
 * from, in the declared order.
 */
export const CONFIG_FILE_NAMES = [
  PACKAGE_JSON_FILE,
  ...PACKAGE_YAML_FILES,
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
