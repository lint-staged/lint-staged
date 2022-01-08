import makeConsoleMock from 'consolemock'

import { validateConfig } from '../lib/validateConfig.mjs'

const configPath = '.lintstagedrc.json'

describe('validateConfig', () => {
  let logger

  beforeEach(() => {
    logger = makeConsoleMock()
  })

  it('should throw and should print validation errors for invalid config 1', () => {
    const invalidConfig = 'test'

    expect(() =>
      validateConfig(invalidConfig, configPath, logger)
    ).toThrowErrorMatchingInlineSnapshot(`"Configuration should be an object or a function"`)
  })

  it('should throw and should print validation errors for invalid config', () => {
    const invalidConfig = {
      foo: false,
    }

    expect(() => validateConfig(invalidConfig, configPath, logger))
      .toThrowErrorMatchingInlineSnapshot(`
      "✖ Validation Error:

        Invalid value for 'foo': false

        Should be a string, a function, or an array of strings and functions."
    `)
  })

  it('should throw for empty config', () => {
    expect(() => validateConfig({}, configPath, logger)).toThrowErrorMatchingInlineSnapshot(
      `"Configuration should not be empty"`
    )
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

    expect(() => validateConfig(advancedConfig, configPath, logger))
      .toThrowErrorMatchingInlineSnapshot(`
      "✖ Validation Error:

        Invalid value for 'chunkSize': 10

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'concurrent': false

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'globOptions': { matchBase: false }

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'ignore': [ 'test.js' ]

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'linters': { '*.js': [ 'eslint' ] }

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'relative': true

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'renderer': 'silent'

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'subTaskConcurrency': 10

        Advanced configuration has been deprecated."
    `)
    expect(logger.printHistory()).toMatchInlineSnapshot(`
      "
      ERROR Could not parse lint-staged config.

      ✖ Validation Error:

        Invalid value for 'chunkSize': 10

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'concurrent': false

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'globOptions': { matchBase: false }

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'ignore': [ 'test.js' ]

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'linters': { '*.js': [ 'eslint' ] }

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'relative': true

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'renderer': 'silent'

        Advanced configuration has been deprecated.

      ✖ Validation Error:

        Invalid value for 'subTaskConcurrency': 10

        Advanced configuration has been deprecated.

      See https://github.com/okonet/lint-staged#configuration."
    `)
  })

  it('should not throw when config contains deprecated key but with valid task', () => {
    const stillValidConfig = {
      concurrent: 'my command',
    }

    expect(() => validateConfig(stillValidConfig, configPath, logger)).not.toThrow()
    expect(logger.printHistory()).toEqual('')
  })
})
