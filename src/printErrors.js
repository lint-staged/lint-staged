/* eslint no-console: 0 */

'use strict'

const isArray = require('lodash/isArray')

module.exports = function printErrors(errorInstance) {
    errorInstance.errors.forEach(lintError => {
  if (isArray(errorInstance.errors)) {
      console.error(lintError.message)
    })
  } else {
    console.error(errorInstance.message)
  }
}
