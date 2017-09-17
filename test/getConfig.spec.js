import { cloneDeep } from 'lodash'
import { getConfig } from '../src/config-util'

describe('getConfig', () => {
  it('should return config with defaults for undefined', () => {
    expect(getConfig()).toMatchSnapshot()
  })

  it('should return config with defaults', () => {
    expect(getConfig({})).toMatchSnapshot()
  })

  it('should set verbose', () => {
    expect(getConfig({})).toEqual(
      expect.objectContaining({
        verbose: false
      })
    )

    expect(
      getConfig({
        verbose: false
      })
    ).toEqual(
      expect.objectContaining({
        verbose: false
      })
    )

    expect(
      getConfig({
        verbose: true
      })
    ).toEqual(
      expect.objectContaining({
        verbose: true
      })
    )
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

  it('should set renderer based on verbose key', () => {
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

    expect(
      getConfig({
        verbose: false
      })
    ).toEqual(
      expect.objectContaining({
        renderer: 'update'
      })
    )

    expect(
      getConfig({
        verbose: true
      })
    ).toEqual(
      expect.objectContaining({
        renderer: 'verbose'
      })
    )
  })

  it('should set gitDir', () => {
    expect(getConfig({})).toEqual(
      expect.objectContaining({
        gitDir: '.'
      })
    )

    expect(
      getConfig({
        gitDir: '../path'
      })
    ).toEqual(
      expect.objectContaining({
        gitDir: '../path'
      })
    )
  })

  it('should set linters', () => {
    expect(getConfig()).toEqual(
      expect.objectContaining({
        linters: []
      })
    )

    expect(getConfig({})).toEqual(
      expect.objectContaining({
        linters: []
      })
    )

    expect(
      getConfig({
        '*.js': 'eslint'
      })
    ).toEqual(
      expect.objectContaining({
        linters: [
          {
            includes: ['*.js'],
            excludes: [],
            commands: ['eslint']
          }
        ]
      })
    )

    expect(
      getConfig([
        {
          includes: ['*.js'],
          commands: 'eslint'
        }
      ])
    ).toEqual(
      expect.objectContaining({
        linters: [
          {
            includes: ['*.js'],
            excludes: [],
            commands: ['eslint']
          }
        ]
      })
    )

    expect(
      getConfig([
        {
          includes: ['*.js'],
          excludes: ['*.ignore.js'],
          commands: 'eslint'
        },
        {
          includes: ['*.css'],
          excludes: ['*.ignore.css'],
          commands: ['postcss --config path/to/your/config --replace', 'stylelint', 'git add']
        }
      ])
    ).toEqual(
      expect.objectContaining({
        linters: [
          {
            includes: ['*.js'],
            excludes: ['*.ignore.js'],
            commands: ['eslint']
          },
          {
            includes: ['*.css'],
            excludes: ['*.ignore.css'],
            commands: ['postcss --config path/to/your/config --replace', 'stylelint', 'git add']
          }
        ]
      })
    )

    expect(
      getConfig({
        linters: [
          {
            includes: ['*.js'],
            commands: ['eslint --fix', 'git add']
          },
          {
            includes: ['.*rc'],
            commands: ['jsonlint']
          }
        ]
      })
    ).toMatchSnapshot()

    expect(
      getConfig({
        linters: [
          {
            includes: ['*.js'],
            excludes: ['*.ignore.js', '*.autogen.js'],
            commands: ['eslint --fix', 'git add']
          }
        ]
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
      gitDir: '/to',
      globOptions: {
        matchBase: false,
        dot: true
      },
      linters: [{ includes: ['*.js'], excludes: [], commands: ['eslint'] }],
      subTaskConcurrency: 10,
      renderer: 'custom',
      verbose: true
    }
    expect(getConfig(cloneDeep(src))).toEqual(src)
  })
})
