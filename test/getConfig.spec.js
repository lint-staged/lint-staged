import makeConsoleMock from 'consolemock'
import { cloneDeep } from 'lodash'
import { getConfig, validateConfig } from '../src/getConfig'

describe('getConfig', () => {
  it('should return config with defaults for undefined', () => {
    expect(getConfig()).toMatchSnapshot()
  })

  it('should return config with defaults', () => {
    expect(getConfig({})).toMatchSnapshot()
  })

  it('should set concurrent', () => {
    expect(getConfig({})).toEqual(
      expect.objectContaining({
        concurrent: true
      })
    )

    expect(
      getConfig({
        concurrent: false
      })
    ).toEqual(
      expect.objectContaining({
        concurrent: false
      })
    )

    expect(
      getConfig({
        concurrent: true
      })
    ).toEqual(
      expect.objectContaining({
        concurrent: true
      })
    )
  })

  it('should set renderer based on debug mode', () => {
    expect(getConfig({})).toEqual(
      expect.objectContaining({
        renderer: 'update'
      })
    )

    expect(
      getConfig({
        '*.js': ['eslint', 'git add']
      })
    ).toEqual(
      expect.objectContaining({
        renderer: 'update'
      })
    )

    expect(getConfig({}, true)).toEqual(
      expect.objectContaining({
        renderer: 'verbose'
      })
    )
  })

  it('should set linters', () => {
    expect(getConfig()).toEqual(
      expect.objectContaining({
        linters: {}
      })
    )

    expect(getConfig({})).toEqual(
      expect.objectContaining({
        linters: {}
      })
    )

    expect(
      getConfig({
        '*.js': 'eslint'
      })
    ).toEqual(
      expect.objectContaining({
        linters: {
          '*.js': 'eslint'
        }
      })
    )

    expect(
      getConfig({
        linters: {
          '*.js': ['eslint --fix', 'git add'],
          '.*rc': 'jsonlint'
        }
      })
    ).toMatchSnapshot()
  })

  it('should deeply merge configs', () => {
    expect(
      getConfig({
        globOptions: {
          nocase: true
        }
      })
    ).toEqual(
      expect.objectContaining({
        globOptions: {
          nocase: true,
          matchBase: true,
          dot: true
        }
      })
    )
  })

  it('should not add plain linters object to the full config', () => {
    expect(
      getConfig({
        '*.js': 'eslint'
      })
    ).not.toEqual(
      expect.objectContaining({
        '*.js': 'eslint'
      })
    )
  })

  it('should not change config if the whole config was passed', () => {
    const src = {
      concurrent: false,
      chunkSize: 2,
      globOptions: {
        matchBase: false,
        dot: true
      },
      linters: {
        '*.js': 'eslint'
      },
      ignore: ['docs/**/*.js'],
      subTaskConcurrency: 10,
      renderer: 'custom'
    }
    expect(getConfig(cloneDeep(src))).toEqual(src)
  })
})

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

  it('should throw and should print validation errors for invalid config', () => {
    const invalidAdvancedConfig = {
      foo: false,
      chunkSize: 'string'
    }
    expect(() => validateConfig(getConfig(invalidAdvancedConfig))).toThrowErrorMatchingSnapshot()
  })

  it('should not throw and should print validation warnings for mixed config', () => {
    const invalidMixedConfig = {
      concurrent: false,
      '*.js': ['eslint --fix', 'git add']
    }
    expect(() => validateConfig(getConfig(invalidMixedConfig))).not.toThrow()
    expect(console.printHistory()).toMatchSnapshot()
  })

  it('should print deprecation warning for deprecated options', () => {
    const baseConfig = {
      linters: {
        '*.js': ['eslint --fix', 'git add']
      }
    }
    const opts = [{ gitDir: '../' }, { verbose: true }]
    opts.forEach(opt => {
      const configWithDeprecatedOpt = Object.assign(opt, baseConfig)
      expect(() => validateConfig(getConfig(configWithDeprecatedOpt))).not.toThrow()
    })
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
      concurrent: false,
      linters: {
        '*.js': ['eslint --fix', 'git add']
      }
    }
    expect(() => validateConfig(getConfig(validAdvancedConfig))).not.toThrow()
    expect(console.printHistory()).toMatchSnapshot()
  })
})
