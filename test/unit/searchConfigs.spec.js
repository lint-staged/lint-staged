import path from 'path'
import { fileURLToPath } from 'url'
import { afterEach, describe, it, vi } from 'vitest'

import { normalizePath } from '../../lib/normalizePath.js'

vi.mock('../../lib/execGit.js', () => ({
  execGit: vi.fn(async () => {
    /** Mock fails by default */
    return ''
  }),
}))

vi.mock('../../lib/loadConfig.js', () => ({
  loadConfig: vi.fn(async () => {
    /** Mock fails by default */
    return {}
  }),
}))

const { execGit } = await import('../../lib/execGit.js')
const { loadConfig } = await import('../../lib/loadConfig.js')
const { searchConfigs } = await import('../../lib/searchConfigs.js')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('searchConfigs', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should throw for invalid config object', async ({ expect }) => {
    await expect(searchConfigs({ configObject: {} })).rejects.toThrow()
  })

  it('should return config for valid config object', async ({ expect }) => {
    await expect(searchConfigs({ configObject: { '*.js': 'eslint' } })).resolves.toEqual({
      '': { '*.js': 'eslint' },
    })
  })

  it('should return empty object for invalid config path', async ({ expect }) => {
    await expect(
      searchConfigs({ configPath: path.join(__dirname, 'missing.json') })
    ).resolves.toEqual({})
  })

  it('should return config for valid config path', async ({ expect }) => {
    const configPath = '.lintstagedrc.json'
    const config = { '*.js': 'eslint' }
    loadConfig.mockReturnValueOnce({ config, configPath })

    await expect(searchConfigs({ configPath })).resolves.toEqual({
      [configPath]: config,
    })
  })

  it('should return empty object when no config files found', async ({ expect }) => {
    await expect(searchConfigs({})).resolves.toEqual({})
  })

  it('should return empty object when no valid config files found', async ({ expect }) => {
    execGit.mockResolvedValueOnce(`.lintstagedrc.json\u0000`)

    await expect(searchConfigs({})).resolves.toEqual({})
  })

  it('should return config found from git', async ({ expect }) => {
    const configFile = '.lintstagedrc.json'
    const configPath = normalizePath(path.join(process.cwd(), configFile))
    const config = { '*.js': 'eslint' }

    execGit.mockResolvedValueOnce(`${configFile}\u0000`)
    loadConfig.mockResolvedValueOnce({ config, filepath: configPath })

    await expect(searchConfigs({})).resolves.toEqual({ [configPath]: config })
  })

  it('should return auto-discovered config from cwd when not found from git', async ({
    expect,
  }) => {
    const configPath = normalizePath(path.join(process.cwd(), '.lintstagedrc.json'))
    const config = { '*.js': 'eslint' }

    loadConfig.mockResolvedValueOnce({ config, filepath: configPath })

    await expect(searchConfigs({})).resolves.toEqual({ [configPath]: config })
  })

  it('should sort configs so that deepest is first', async ({ expect }) => {
    const config = { '*.js': 'eslint' }

    execGit.mockResolvedValueOnce(
      `H .lintstagedrc.json\u0000H even/deeper/.lintstagedrc.json\u0000H deeper/.lintstagedrc.json\u0000`
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

  it('should ignore config files skipped from the worktree (sparse checkout)', async ({
    expect,
  }) => {
    const config = { '*.js': 'eslint' }

    execGit.mockResolvedValueOnce(`H .lintstagedrc.json\u0000S skipped/.lintstagedrc.json\u0000`)

    const topLevelConfig = normalizePath(path.join(process.cwd(), '.lintstagedrc.json'))
    const skippedConfig = normalizePath(path.join(process.cwd(), 'skipped/.lintstagedrc.json'))

    loadConfig.mockResolvedValueOnce({ config, filepath: topLevelConfig })

    // Mock will return config for skipped file, but it should not be read
    loadConfig.mockResolvedValueOnce({ config, filepath: skippedConfig })

    const configs = await searchConfigs({})

    expect(Object.keys(configs)).toEqual([topLevelConfig])
  })
})
