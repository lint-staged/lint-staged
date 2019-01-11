'use strict'

const execa = require('execa')

async function resolveGitDir() {
  return (await execa('git', ['rev-parse', '--show-toplevel'])).stdout
}

module.exports = resolveGitDir
