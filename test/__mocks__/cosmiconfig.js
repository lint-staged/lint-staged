const actual = jest.requireActual('cosmiconfig')

function cosmiconfig(name, options) {
  return actual.cosmiconfig(name, options)
}

module.exports.cosmiconfig = jest.fn(cosmiconfig)
