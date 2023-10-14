import path from 'node:path'

import { execGit } from '../../lib/execGit.js'
import { loadConfig } from '../../lib/loadConfig.js'
import { normalizePath } from '../../lib/normalizePath.js'
import { searchConfigs } from '../../lib/searchConfigs.js'

jest.mock('../../lib/resolveConfig', () => ({
  /** Unfortunately necessary due to non-ESM tests. */
  resolveConfig: (configPath) => {
    try {
      return require.resolve(configPath)
    } catch {
      return configPath
    }
  },
}))

jest.mock('../../lib/execGit.js', () => ({
  execGit: jest.fn(async () => {
    /** Mock fails by default */
    return ''
  }),
}))

jest.mock('../../lib/loadConfig.js', () => {
  const { searchPlaces } = jest.requireActual('../../lib/loadConfig.js')

  return {
    searchPlaces,
    loadConfig: jest.fn(async () => {
      /** Mock fails by default */
      return {}
    }),
  }
})

describe('searchConfigs', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should throw for invalid config object', async () => {
    await expect(searchConfigs({ configObject: {} })).rejects.toThrowError()
  })

  it('should return config for valid config object', async () => {
    await expect(searchConfigs({ configObject: { '*.js': 'eslint' } })).resolves.toEqual({
      '': { '*.js': 'eslint' },
    })
  })

  it('should return empty object for invalid config path', async () => {
    await expect(
      searchConfigs({ configPath: path.join(__dirname, 'missing.json') })
    ).resolves.toEqual({})
  })

  it('should return config for valid config path', async () => {
    const configPath = '.lintstagedrc.json'
    const config = { '*.js': 'eslint' }
    loadConfig.mockReturnValueOnce({ config, configPath })

    await expect(searchConfigs({ configPath })).resolves.toEqual({
      [configPath]: config,
    })
  })

  it('should return empty object when no config files found', async () => {
    await expect(searchConfigs({})).resolves.toEqual({})
  })

  it('should return empty object when no valid config files found', async () => {
    execGit.mockResolvedValueOnce(`.lintstagedrc.json\u0000`)

    await expect(searchConfigs({})).resolves.toEqual({})
  })

  it('should return config found from git', async () => {
    const configFile = '.lintstagedrc.json'
    const configPath = normalizePath(path.join(process.cwd(), configFile))
    const config = { '*.js': 'eslint' }

    execGit.mockResolvedValueOnce(`${configFile}\u0000`)
    loadConfig.mockResolvedValueOnce({ config, filepath: configPath })

    await expect(searchConfigs({})).resolves.toEqual({ [configPath]: config })
  })

  it('should return auto-discovered config from cwd when not found from git', async () => {
    const configPath = normalizePath(path.join(process.cwd(), '.lintstagedrc.json'))
    const config = { '*.js': 'eslint' }

    loadConfig.mockResolvedValueOnce({ config, filepath: configPath })

    await expect(searchConfigs({})).resolves.toEqual({ [configPath]: config })
  })

  it('should sort configs so that deepest is first', async () => {
    const config = { '*.js': 'eslint' }

    execGit.mockResolvedValueOnce(
      `.lintstagedrc.json\u0000even/deeper/.lintstagedrc.json\u0000deeper/.lintstagedrc.json\u0000`
    )

    const topLevelConfig = normalizePath(path.join(process.cwd(), '.lintstagedrc.json'))
    const deeperConfig = normalizePath(path.join(process.cwd(), 'deeper/.lintstagedrc.json'))
    const evenDeeperConfig = normalizePath(
      path.join(process.cwd(), 'even/deeper/.lintstagedrc.json')
    )

    loadConfig.mockResolvedValueOnce({ config, filepath: topLevelConfig })
    loadConfig.mockResolvedValueOnce({ config, filepath: deeperConfig })
    loadConfig.mockResolvedValueOnce({ config, filepath: evenDeeperConfig })

    const configs = await searchConfigs({})

    expect(Object.keys(configs)).toEqual([evenDeeperConfig, deeperConfig, topLevelConfig])
  })
})
