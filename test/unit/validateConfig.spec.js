import makeConsoleMock from 'consolemock'

import { validateConfig } from '../../lib/validateConfig.js'

const configPath = '.lintstagedrc.json'

describe('validateConfig', () => {
  let logger

  beforeEach(() => {
    logger = makeConsoleMock()
  })

  it('should throw and should print validation errors for invalid config 1', () => {
    const invalidConfig = 'test'

    expect(() => validateConfig(invalidConfig, configPath, logger)).toThrowErrorMatchingSnapshot()
  })

  it('should throw and should print validation errors for invalid config', () => {
    const invalidConfig = {
      foo: false,
    }

    expect(() => validateConfig(invalidConfig, configPath, logger)).toThrowErrorMatchingSnapshot()
  })

  it('should throw for empty config', () => {
    expect(() => validateConfig({}, configPath, logger)).toThrowErrorMatchingSnapshot()
  })

  it('should wrap function config into object', () => {
    const functionConfig = (stagedFiles) => [`eslint --fix ${stagedFiles}', 'git add`]

    expect(validateConfig(functionConfig, configPath, logger)).toEqual({
      '*': functionConfig,
    })
    expect(logger.printHistory()).toEqual('')
  })

  it('should not throw and should print nothing for valid config', () => {
    const validSimpleConfig = {
      '*.js': ['eslint --fix', 'git add'],
    }

    expect(() => validateConfig(validSimpleConfig, configPath, logger)).not.toThrow()
    expect(logger.printHistory()).toEqual('')
  })

  it('should not throw and should print nothing for function task', () => {
    const functionTask = {
      '*.js': (filenames) => {
        const files = filenames.join(' ')
        return `eslint --fix ${files} && git add ${files}`
      },
      '*.css': [(filenames) => filenames.map((filename) => `eslint --fix ${filename}`)],
    }

    expect(() => validateConfig(functionTask, configPath, logger)).not.toThrow()
    expect(logger.printHistory()).toEqual('')
  })
})
