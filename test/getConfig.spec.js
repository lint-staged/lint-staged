/* eslint no-console: 0 */

import stripColors from 'strip-ansi'
import getConfig from '../src/getConfig'

describe('getConfig', () => {
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
        gitDir: '..'
      })
    ).toEqual(
      expect.objectContaining({
        gitDir: '..'
      })
    )
  })

  it('should set linters', () => {
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

  xit('should output config to stdout in verbose mode', () => {
    const stdout = []
    console.log = jest.fn().mockImplementation(input => {
      stdout.push(JSON.stringify(stripColors(input)))
    })
    getConfig({ verbose: true })
    expect(console.log).toHaveBeenCalledTimes(1)
    expect(stdout).toMatchSnapshot()
  })
})
