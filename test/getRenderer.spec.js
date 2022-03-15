import { getRenderer } from '../lib/getRenderer'

describe('getRenderer', () => {
  it('should return silent renderers when quiet', () => {
    expect(getRenderer({ quiet: true }, {})).toEqual({
      renderer: 'silent',
      nonTTYRenderer: 'silent',
    })
  })

  it('should return verbose renderers when NODE_ENV=test', () => {
    expect(getRenderer({}, { NODE_ENV: 'test' })).toEqual({
      renderer: 'verbose',
      nonTTYRenderer: 'verbose',
    })
  })

  it('should return test renderers when TERM=dumb', () => {
    expect(getRenderer({}, { TERM: 'dumb' })).toEqual({
      renderer: 'verbose',
      nonTTYRenderer: 'verbose',
    })
  })

  it('should return verbose renderers when debug', () => {
    expect(getRenderer({ debug: true }, {})).toEqual({
      renderer: 'verbose',
      nonTTYRenderer: 'verbose',
    })
  })

  it('should return update main renderer and verbose fallback renderer by default', () => {
    expect(getRenderer({}, {})).toEqual({
      renderer: 'update',
      rendererOptions: {
        dateFormat: false,
      },
      nonTTYRenderer: 'verbose',
    })
  })

  it('should return update main renderer and verbose fallback renderer when colors are not forced', () => {
    expect(getRenderer({}, { FORCE_COLOR: '0' })).toEqual({
      renderer: 'update',
      rendererOptions: {
        dateFormat: false,
      },
      nonTTYRenderer: 'verbose',
    })
  })

  it('should return update renderers when colors are forced', () => {
    expect(getRenderer({}, { FORCE_COLOR: '1' })).toEqual({
      renderer: 'update',
      rendererOptions: {
        dateFormat: false,
      },
      nonTTYRenderer: 'update',
    })
  })
})
