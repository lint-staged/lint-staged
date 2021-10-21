const actual = jest.requireActual('lilconfig')

function lilconfig(name, options) {
  return actual.lilconfig(name, options)
}

module.exports.lilconfig = jest.fn(lilconfig)
