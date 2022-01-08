import { getRenderer } from '../lib/getRenderer.mjs'

describe('getRenderer', () => {
  it('should return silent renderer when quiet', () => {
    expect(getRenderer({ quiet: true }, {})).toEqual({ renderer: 'silent' })
  })

  it('should return verbose renderer when NODE_ENV=test', () => {
    expect(getRenderer({}, { NODE_ENV: 'test' })).toEqual({ renderer: 'verbose' })
  })

  it('should return test renderer when TERM=dumb', () => {
    expect(getRenderer({}, { TERM: 'dumb' })).toEqual({ renderer: 'verbose' })
  })

  it('should return verbose renderer when debug', () => {
    expect(getRenderer({ debug: true }, {})).toEqual({ renderer: 'verbose' })
  })

  it('should return update renderer by default', () => {
    expect(getRenderer({}, {})).toEqual({
      renderer: 'update',
      rendererOptions: {
        dateFormat: false,
      },
    })
  })
})
