/** Unfortunately necessary due to non-ESM tests. */
jest.mock('../../../lib/resolveConfig.js', () => ({
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))
