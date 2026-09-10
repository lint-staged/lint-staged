/**
 * TypeScript helper to define `lint-staged` configuration.
 * Use as the default export in a configuration file like `lint-staged.config.js`.
 *
 * @param {import('./config.d.ts').Configuration} configuration
 *
 * @example
 * export default defineConfig({
 *   "*.js": ["prettier --check", "eslint"]
 * })
 */
export function defineConfig(configuration) {
  return configuration
}
