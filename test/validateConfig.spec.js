import makeConsoleMock from 'consolemock'

import validateConfig from '../lib/validateConfig'

describe('validateConfig', () => {
  const originalConsole = global.console
  beforeAll(() => {
    global.console = makeConsoleMock()
  })

  beforeEach(() => {
    global.console.clearHistory()
  })

  afterAll(() => {
    global.console = originalConsole
  })

  it('should throw and should print validation errors for invalid config 1', () => {
    const invalidConfig = 'test'
    expect(() => validateConfig(invalidConfig)).toThrowErrorMatchingSnapshot()
  })

  it('should throw and should print validation errors for invalid config', () => {
    const invalidConfig = {
      foo: false
    }
    expect(() => validateConfig(invalidConfig)).toThrowErrorMatchingSnapshot()
  })

  it('should not throw and should print nothing for valid config', () => {
    const validSimpleConfig = {
      '*.js': ['eslint --fix', 'git add']
    }
    expect(() => validateConfig(validSimpleConfig)).not.toThrow()
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should not throw and should print nothing for function task', () => {
    expect(() =>
      validateConfig({
        '*.js': filenames => {
          const files = filenames.join(' ')
          return `eslint --fix ${files} && git add ${files}`
        },
        '*.css': [filenames => filenames.map(filename => `eslint --fix ${filename}`)]
      })
    ).not.toThrow()
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should throw when function task returns incorrect values', () => {
    const invalidConfig = {
      '*.js': filenames => filenames.map(file => [`eslint --fix ${file}`, `git add ${file}`])
    }
    expect(() => validateConfig(invalidConfig)).toThrowErrorMatchingSnapshot()
  })

  it('should throw when detecting deprecated advanced configuration', () => {
    const advancedConfig = {
      chunkSize: 10,
      concurrent: false,
      globOptions: { matchBase: false },
      ignore: ['test.js'],
      linters: {
        '*.js': ['eslint']
      },
      relative: true,
      renderer: 'silent',
      subTaskConcurrency: 10
    }

    expect(() => validateConfig(advancedConfig)).toThrowErrorMatchingSnapshot()
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should not throw when config contains deprecated key but with valid task', () => {
    const stillValidConfig = {
      concurrent: 'my command'
    }
    expect(() => validateConfig(stillValidConfig)).not.toThrow()
    expect(console.printHistory()).toMatchSnapshot()
  })
})
