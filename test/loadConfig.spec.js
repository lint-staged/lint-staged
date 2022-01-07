jest.mock('../lib/resolveConfig', () => ({
  /** Unfortunately necessary due to non-ESM tests. */
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))

import { dynamicImport } from '../lib/loadConfig.js'

describe('dynamicImport', () => {
  it('should log errors into console', () => {
    expect(() => dynamicImport('not-found.js')).rejects.toThrowError(`Cannot find module`)
  })
})
