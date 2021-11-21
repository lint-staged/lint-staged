import makeConsoleMock from 'consolemock'

import { dynamicImport } from '../lib/loadConfig.js'

describe('dynamicImport', () => {
  const globalConsoleTemp = console

  beforeEach(() => {
    console = makeConsoleMock()
  })

  afterAll(() => {
    console = globalConsoleTemp
  })

  it('should log errors into console', () => {
    expect(() => dynamicImport('not-found.js')).rejects.toThrowError(`Cannot find module`)
  })
})
