'use strict'

const execa = require('execa')

module.exports = async function resolveGitDir() {
  return (await execa('git', ['rev-parse', '--show-toplevel'])).stdout
}
