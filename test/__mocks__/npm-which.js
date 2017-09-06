'use strict'

const includes = require('lodash/includes')

jest.genMockFromModule('npm-which')

function sync(path) {
  if (includes(path, 'missing')) {
    throw new Error(`not found: ${path}`)
  }
  return path
}

module.exports = function npmWhich() {
  return {
    sync
  }
}
