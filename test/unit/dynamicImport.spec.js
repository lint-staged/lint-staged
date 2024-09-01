import { dynamicImport } from '../../lib/dynamicImport.js'

describe('dynamicImport', () => {
  it('should log errors into console', async () => {
    await expect(() => dynamicImport('not-found.js')).rejects.toThrow(`Cannot find module`)
  })
})
