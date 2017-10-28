const actual = require.requireActual('cosmiconfig')
const mock = jest.genMockFromModule('cosmiconfig')

function cosmiconfig(name, options) {
  if (options.configPath) {
    return actual(name, options)
  }

  return mock(name, options)
}

module.exports = jest.fn(cosmiconfig)
