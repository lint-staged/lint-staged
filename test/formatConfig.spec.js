import formatConfig from '../lib/formatConfig'

describe('formatConfig', () => {
  it('Object config should return as is', () => {
    const simpleConfig = {
      '*.js': ['eslint --fix', 'git add'],
    }
    expect(formatConfig(simpleConfig)).toEqual(simpleConfig)
  })

  it('Function config should be converted to object', () => {
    const functionConfig = (stagedFiles) => [`eslint --fix ${stagedFiles}', 'git add`]
    expect(formatConfig(functionConfig)).toEqual({
      '*': functionConfig,
    })
  })
})
