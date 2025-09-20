import { describe, it } from 'vitest'

import { getRenderer } from '../../lib/getRenderer.js'
describe('getRenderer', () => {
  it('should return silent renderers when quiet', ({ expect }) => {
    expect(getRenderer({ color: true, quiet: true }, console, {})).toEqual({
      renderer: 'silent',
      fallbackRenderer: 'silent',
    })
  })

  it('should return test renderers when NODE_ENV=test', ({ expect }) => {
    expect(getRenderer({ color: true }, console, { NODE_ENV: 'test' })).toEqual({
      renderer: 'test',
      fallbackRenderer: 'test',
      rendererOptions: {
        logger: expect.any(Object),
      },
    })
  })

  it('should return test renderers when color not supported', ({ expect }) => {
    expect(getRenderer({ color: false }, console, {})).toEqual({
      renderer: 'verbose',
      fallbackRenderer: 'verbose',
    })
  })

  it('should return verbose renderers when debug', ({ expect }) => {
    expect(getRenderer({ color: true, debug: true }, console, {})).toEqual({
      renderer: 'verbose',
      fallbackRenderer: 'verbose',
    })
  })

  it('should return update main renderer and verbose fallback renderer by default', ({
    expect,
  }) => {
    expect(getRenderer({ color: true }, console, {})).toEqual({
      renderer: 'update',
      fallbackRenderer: 'verbose',
      rendererOptions: {
        formatOutput: 'truncate',
      },
    })
  })
})
