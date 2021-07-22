import makeConsoleMock from 'consolemock'

import validateConfig, { BRACES_REGEXP } from '../lib/validateConfig'

describe('BRACES_REGEXP', () => {
  it(`should match '*.{js}'`, () => {
    expect('*.{js}'.match(BRACES_REGEXP))
  })

  it(`should match 'file_{10}'`, () => {
    expect('file_{test}'.match(BRACES_REGEXP))
  })

  it(`should match '*.{spec\\.js}'`, () => {
    expect('*.{spec\\.js}'.match(BRACES_REGEXP))
  })

  it(`should not match '.{js,ts}'`, () => {
    expect('.{js,ts}'.match(BRACES_REGEXP))
  })

  it(`should not match 'file_{1..10}'`, () => {
    expect('file_{1..10}'.match(BRACES_REGEXP))
  })

  it(`should not match '*.\\{js\\}'`, () => {
    expect('*.\\{js\\}'.match(BRACES_REGEXP))
  })

  it(`should not match '*.\\{js}'`, () => {
    expect('*.\\{js}'.match(BRACES_REGEXP))
  })

  it(`should not match '*.{js\\}'`, () => {
    expect('*.{js\\}'.match(BRACES_REGEXP))
  })
})

describe('validateConfig', () => {
  let logger

  beforeEach(() => {
    logger = makeConsoleMock()
  })

  it('should throw and should print validation errors for invalid config 1', () => {
    const invalidConfig = 'test'

    expect(() => validateConfig(invalidConfig, logger)).toThrowErrorMatchingSnapshot()
  })

  it('should throw and should print validation errors for invalid config', () => {
    const invalidConfig = {
      foo: false,
    }

    expect(() => validateConfig(invalidConfig, logger)).toThrowErrorMatchingSnapshot()
  })

  it('should wrap function config into object', () => {
    const functionConfig = (stagedFiles) => [`eslint --fix ${stagedFiles}', 'git add`]

    expect(validateConfig(functionConfig, logger)).toEqual({
      '*': functionConfig,
    })
    expect(logger.printHistory()).toEqual('')
  })

  it('should not throw and should print nothing for valid config', () => {
    const validSimpleConfig = {
      '*.js': ['eslint --fix', 'git add'],
    }

    expect(() => validateConfig(validSimpleConfig, logger)).not.toThrow()
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

    expect(() => validateConfig(functionTask, logger)).not.toThrow()
    expect(logger.printHistory()).toEqual('')
  })

  it('should throw when detecting deprecated advanced configuration', () => {
    const advancedConfig = {
      chunkSize: 10,
      concurrent: false,
      globOptions: { matchBase: false },
      ignore: ['test.js'],
      linters: {
        '*.js': ['eslint'],
      },
      relative: true,
      renderer: 'silent',
      subTaskConcurrency: 10,
    }

    expect(() => validateConfig(advancedConfig, logger)).toThrowErrorMatchingSnapshot()
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should not throw when config contains deprecated key but with valid task', () => {
    const stillValidConfig = {
      concurrent: 'my command',
    }

    expect(() => validateConfig(stillValidConfig, logger)).not.toThrow()
    expect(logger.printHistory()).toEqual('')
  })

  it('should warn about `*.{js}` and return fixed config', () => {
    const incorrectBracesConfig = {
      '*.{js}': 'eslint',
    }

    expect(() => validateConfig(incorrectBracesConfig, logger)).not.toThrow()
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should warn about `*.{ts}{x}` and return fixed config', () => {
    const incorrectBracesConfig = {
      '*.{ts}{x}': 'eslint',
    }

    expect(() => validateConfig(incorrectBracesConfig, logger)).not.toThrow()
    expect(logger.printHistory()).toMatchSnapshot()
  })

  it('should not warn about `*.\\{js\\}`', () => {
    const incorrectBracesConfig = {
      '*.\\{js\\}': 'eslint',
    }

    expect(() => validateConfig(incorrectBracesConfig, logger)).not.toThrow()
    expect(logger.printHistory()).toEqual('')
  })
})
