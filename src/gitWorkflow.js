'use strict'

const path = require('path')
const execa = require('execa')

function getAbsolutePath(dir) {
  return path.isAbsolute(dir) ? dir : path.resolve(dir)
}

function getCmdArgs(gitDir) {
  if (gitDir) {
    return ['--git-dir', getAbsolutePath(gitDir)]
  }
  return []
}

function execGit(cmd, options) {
  const cwd = options && options.cwd ? options.cwd : process.cwd()
  const gitDir = options && options.gitDir
  return execa('git', getCmdArgs(gitDir).concat(cmd), { cwd: getAbsolutePath(cwd) })
}

function gitStashSave(options) {
  return execGit(['stash', '--keep-index'], options)
}

function gitStashPop(options) {
  return execGit(['stash'], options)
    .then(() => execGit(['stash', 'pop', 'stash@{1}'], options))
    .then(() => execGit(['read-tree', 'stash'], options))
    .then(() => execGit(['stash', 'drop'], options))
}

module.exports = {
  getAbsolutePath,
  getCmdArgs,
  execGit,
  gitStashSave,
  gitStashPop
}
