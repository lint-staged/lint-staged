import { describe, it } from 'vitest'

import { groupFilesByConfig } from '../../lib/groupFilesByConfig.js'

describe('groupFilesByConfig', () => {
  it('should return no groups in single-config mode when configs are empty', async ({ expect }) => {
    const result = await groupFilesByConfig({
      configs: {},
      files: [],
      singleConfigMode: true,
    })

    expect(result).toEqual({})
  })

  it('should assign files only to the first config in the same directory', async ({ expect }) => {
    const firstConfig = { '*.js': 'eslint' }
    const secondConfig = { '*.js': 'prettier --write' }

    /** @type {import('../../lib/getStagedFiles.js').StagedFile[]} */
    const files = [
      { filepath: '/repo/file.js', status: 'M' },
      { filepath: '/repo/nested/file.js', status: 'A' },
    ]

    const result = await groupFilesByConfig({
      configs: {
        '/repo/.lintstagedrc.json': firstConfig,
        '/repo/lint-staged.config.js': secondConfig,
      },
      files,
    })

    expect(result).toEqual({
      '/repo/.lintstagedrc.json': { config: firstConfig, files },
      '/repo/lint-staged.config.js': { config: secondConfig, files: [] },
    })
  })
})
