/* eslint no-console: 0 */

import { makeConsoleMock } from 'consolemock'
import { getConfig, validateConfig } from '../src/config-util'

describe('validateConfig', () => {
  beforeEach(() => {
    global.console = makeConsoleMock()
  })

  it('should throw and should print validation errors for invalid config', () => {
    const invalidAdvancedConfig = {
      foo: false,
      chunkSize: 'string',
      gitDir: 111
    }
    expect(() => validateConfig(getConfig(invalidAdvancedConfig))).toThrowErrorMatchingSnapshot()
  })

  it('should not throw and should print validation warnings for mixed config', () => {
    const invalidMixedConfig = {
      gitDir: './path/to/packagejson/',
      '*.js': ['eslint --fix', 'git add']
    }
    expect(() => validateConfig(getConfig(invalidMixedConfig))).not.toThrow()
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should not throw and should print nothing for simple valid config', () => {
    const validSimpleConfig = {
      '*.js': ['eslint --fix', 'git add']
    }
    expect(() => validateConfig(getConfig(validSimpleConfig))).not.toThrow()
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should not throw and should print nothing for advanced valid config', () => {
    const validAdvancedConfig = {
      gitDir: '.',
      linters: {
        '*.js': ['eslint --fix', 'git add']
      }
    }
    expect(() => validateConfig(getConfig(validAdvancedConfig))).not.toThrow()
    expect(console.printHistory()).toMatchSnapshot()
  })
})
