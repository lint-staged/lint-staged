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

function hasPartiallyStaged(options) {
  return execGit(['write-tree'], options)
    .then(res => {
      const tree = res.stdout
      if (tree) {
        return execGit(['diff-index', '--exit-code', '--name-only', tree, '--'])
      }
      return false
    })
    .then(() => false) // No unstaged files found
    .catch(() => true) // Found unstaged files
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
  gitStashPop,
  hasPartiallyStaged
}
