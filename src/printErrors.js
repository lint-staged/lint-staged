/* eslint no-console: 0 */

'use strict'

const isArray = require('lodash/isArray')
const forEach = require('lodash/forEach')

module.exports = function printErrors(errorInstance) {
  if (isArray(errorInstance.errors)) {
    forEach(errorInstance.errors, lintError => {
      console.error(lintError.message)
    })
  } else {
    console.error(errorInstance.message)
  }
}
