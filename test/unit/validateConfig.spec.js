import makeConsoleMock from 'consolemock'
import { beforeEach, describe, it } from 'vitest'

import { validateConfig } from '../../lib/validateConfig.js'

const configPath = '.lintstagedrc.json'

describe('validateConfig', () => {
  let logger

  beforeEach(() => {
    logger = makeConsoleMock()
  })

  it('should throw and should print validation errors for invalid config', ({ expect }) => {
    const invalidConfig = 'test'

    expect(() =>
      validateConfig(invalidConfig, configPath, logger)
    ).toThrowErrorMatchingInlineSnapshot(`[Error: Configuration should be an object or a function]`)
  })

  it('should throw and should print validation errors for invalid config 2', ({ expect }) => {
    const invalidConfig = {
      foo: false,
    }

    expect(() => validateConfig(invalidConfig, configPath, logger))
      .toThrowErrorMatchingInlineSnapshot(`
      [Error: ✖ Validation Error:

        Invalid value for 'foo': false

        Should be a string, a function, an object or an array of strings and functions.]
    `)
  })

  it('should throw and should print validation errors for invalid config 3', ({ expect }) => {
    const invalidConfig = {
      '*.js': [false],
    }

    expect(() => validateConfig(invalidConfig, configPath, logger))
      .toThrowErrorMatchingInlineSnapshot(`
      [Error: ✖ Validation Error:

        Invalid value for '*.js': [ false ]

        Should be an array of strings or functions.]
    `)
  })

  it('should throw and should print validation errors for invalid object config', ({ expect }) => {
    const invalidConfig = {
      '*.js': {
        title: 'Running a custom task',
      },
    }

    expect(() => validateConfig(invalidConfig, configPath, logger))
      .toThrowErrorMatchingInlineSnapshot(`
      [Error: ✖ Validation Error:

        Invalid value for '*.js': { title: 'Running a custom task' }

        Function task should contain \`title\` and \`task\` fields, where \`title\` should be a string and \`task\` should be a function.]
    `)
  })

  it('should not throw and should print nothing for valid object config', ({ expect }) => {
    const validObjectConfig = {
      '*.js': {
        title: 'Running a custom task',
        task: async (files) => {
          console.log(files)
        },
      },
    }

    expect(() => validateConfig(validObjectConfig, configPath, logger)).not.toThrow()
    expect(logger.printHistory()).toEqual('')
  })

  it('should throw for empty config', ({ expect }) => {
    expect(() => validateConfig({}, configPath, logger)).toThrowErrorMatchingInlineSnapshot(
      `[Error: Configuration should not be empty]`
    )
  })

  it('should wrap function config into object', ({ expect }) => {
    const functionConfig = (stagedFiles) => [`eslint --fix ${stagedFiles}', 'git add`]

    expect(validateConfig(functionConfig, configPath, logger)).toEqual({
      '*': functionConfig,
    })
    expect(logger.printHistory()).toEqual('')
  })

  it('should not throw and should print nothing for valid config', ({ expect }) => {
    const validSimpleConfig = {
      '*.js': ['eslint --fix', 'git add'],
    }

    expect(() => validateConfig(validSimpleConfig, configPath, logger)).not.toThrow()
    expect(logger.printHistory()).toEqual('')
  })

  it('should not throw and should print nothing for function task', ({ expect }) => {
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
