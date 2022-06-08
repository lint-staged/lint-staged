import { dynamicImport } from '../../lib/dynamicImport.js'

describe('dynamicImport', () => {
  it('should log errors into console', () => {
    expect(() => dynamicImport('not-found.js')).rejects.toThrowError(`Cannot find module`)
  })
})
