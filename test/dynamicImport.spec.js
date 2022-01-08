import { dynamicImport } from '../lib/dynamicImport.js'

describe('dynamicImport', () => {
  it('fails when module is not found', async () => {
    await expect(() => dynamicImport('not-found.js')).rejects.toBeTruthy()
  })
})
