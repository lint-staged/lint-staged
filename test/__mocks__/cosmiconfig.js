const actual = require.requireActual('cosmiconfig')

function cosmiconfig(name, options) {
  return actual(name, options)
}

module.exports = jest.fn(cosmiconfig)
