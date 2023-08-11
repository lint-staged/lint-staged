import { getRenderer } from '../../lib/getRenderer.js'

describe('getRenderer', () => {
  it('should return silent renderers when quiet', () => {
    expect(getRenderer({ quiet: true }, console, {})).toEqual({
      renderer: 'silent',
      fallbackRenderer: 'silent',
    })
  })

  it('should return test renderers when NODE_ENV=test', () => {
    expect(getRenderer({}, console, { NODE_ENV: 'test' })).toEqual({
      renderer: 'test',
      fallbackRenderer: 'test',
      rendererOptions: {
        logger: expect.any(Object),
      },
    })
  })

  it('should return test renderers when TERM=dumb', () => {
    expect(getRenderer({}, console, { TERM: 'dumb' })).toEqual({
      renderer: 'verbose',
      fallbackRenderer: 'verbose',
    })
  })

  it('should return verbose renderers when debug', () => {
    expect(getRenderer({ debug: true }, console, {})).toEqual({
      renderer: 'verbose',
      fallbackRenderer: 'verbose',
    })
  })

  it('should return update main renderer and verbose fallback renderer by default', () => {
    expect(getRenderer({}, console, {})).toEqual({
      renderer: 'update',
      fallbackRenderer: 'verbose',
      rendererOptions: {
        formatOutput: 'truncate',
      },
    })
  })

  it('should return update main renderer and verbose fallback renderer when colors are not forced', () => {
    expect(getRenderer({}, console, { FORCE_COLOR: '0' })).toEqual({
      renderer: 'update',
      fallbackRenderer: 'verbose',
      rendererOptions: {
        formatOutput: 'truncate',
      },
    })
  })

  it('should return update renderers when colors are forced', () => {
    expect(getRenderer({}, console, { FORCE_COLOR: '1' })).toEqual({
      renderer: 'update',
      fallbackRenderer: 'update',
      rendererOptions: {
        formatOutput: 'truncate',
      },
    })
  })
})
