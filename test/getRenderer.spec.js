import getRenderer from '../lib/getRenderer'

describe('getRenderer', () => {
  it('should return silent when quiet', () => {
    expect(getRenderer({ quiet: true }, {})).toEqual('silent')
  })

  it('should return test when NODE_ENV=test', () => {
    expect(getRenderer({}, { NODE_ENV: 'test' })).toEqual('test')
  })

  it('should return test when TERM=dumb', () => {
    expect(getRenderer({}, { TERM: 'dumb' })).toEqual('test')
  })

  it('should return verbose when debug', () => {
    expect(getRenderer({ debug: true }, {})).toEqual('verbose')
  })

  it('should return update by default', () => {
    expect(getRenderer({}, {})).toEqual('update')
  })
})
