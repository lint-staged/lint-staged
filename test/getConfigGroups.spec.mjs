import makeConsoleMock from 'consolemock'
import { jest } from '@jest/globals'

jest.unstable_mockModule('../lib/loadConfig.mjs', () => ({
  // config not found
  loadConfig: jest.fn(async () => ({})),
}))

const { getConfigGroups } = await import('../lib/getConfigGroups.mjs')
const { loadConfig } = await import('../lib/loadConfig.mjs')

const globalConsoleTemp = console

const config = {
  '*.js': 'my-task',
}

describe('getConfigGroups', () => {
  beforeEach(() => {
    console = makeConsoleMock()
  })

  afterEach(() => {
    console.printHistory()
    console = globalConsoleTemp
  })

  it('should throw when config path not found', async () => {
    await expect(getConfigGroups({ configPath: '/' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Configuration could not be found"`
    )
  })

  it('should return validated config from path', async () => {
    const filepath = '/.lintstagedrc.json'
    const files = ['/test.js']

    loadConfig.mockResolvedValueOnce({ config, filepath })

    await expect(getConfigGroups({ configPath: filepath, files })).resolves.toEqual({
      [filepath]: { config, files },
    })
  })

  it('should throw when config not found', async () => {
    await expect(
      getConfigGroups({ files: ['/foo.js'] })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Configuration could not be found"`)
  })

  it('should find config files for all staged files', async () => {
    // '/foo.js' and '/bar.js'
    loadConfig.mockResolvedValueOnce({ config, filepath: '/.lintstagedrc.json' })
    // '/deeper/foo.js'
    loadConfig.mockResolvedValueOnce({ config, filepath: '/deeper/.lintstagedrc.json' })
    // '/even/deeper/foo.js'
    loadConfig.mockResolvedValueOnce({ config, filepath: '/deeper/.lintstagedrc.json' })

    const configGroups = await getConfigGroups({
      files: ['/foo.js', '/bar.js', '/deeper/foo.js', '/even/deeper/foo.js'],
    })

    expect(configGroups).toEqual({
      '/.lintstagedrc.json': { config, files: ['/foo.js', '/bar.js'] },
      '/deeper/.lintstagedrc.json': { config, files: ['/deeper/foo.js', '/even/deeper/foo.js'] },
    })
  })
})
