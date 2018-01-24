'use strict'

const path = require('path')
const execa = require('execa')
const fsp = require('fs-promise')

let patchPath

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

function getUnstagedFiles(options) {
  return execGit(['write-tree'], options)
    .then(res => {
      const tree = res.stdout
      if (tree) {
        return execGit(['diff-index', '--name-only', tree, '--'], options)
      }
      return []
    })
    .then(files => (files.stdout ? files.stdout.split('\n') : []))
}

function getStagedFiles(options) {
  return execGit(['write-tree'], options)
    .then(res => {
      const tree = res.stdout
      if (tree) {
        return execGit(['diff-index', '--cached', '--name-only', tree, '--'], options)
      }
      return []
    })
    .then(files => (files.stdout ? files.stdout.split('\n') : []))
}

function hasUnstagedFiles(options) {
  return getUnstagedFiles(options).then(files => files.length > 0)
}

function hasPartiallyStagedFiles(unstaged, staged) {
  return unstaged.some(file => staged.includes(file))
}

function generatePatch(options) {
  const cwd = options && options.cwd ? options.cwd : process.cwd()
  return execGit(['write-tree'], options)
    .then(res => {
      const tree = res.stdout
      if (tree) {
        return execGit(
          [
            'diff-index',
            '--exit-code',
            '--ignore-submodules',
            '--binary',
            '--no-color',
            '--no-ext-diff',
            tree,
            '--'
          ],
          options
        )
      }
      return Promise.resolve(null)
    })
    .then(() => {
      console.log('Nothing to do...')
    })
    .catch(res => {
      console.warn('Unstaged files detected.')
      const patch = res.stdout
      const filePath = path.join(cwd, '.lint-staged.patch')
      console.log(`Stashing unstaged files to ${filePath}...`)
      return fsp.writeFile(filePath, patch).then(() => filePath) // Resolve with filePath
    })
}

function gitApply(patch, options) {
  return execGit(['apply', '--whitespace=nowarn', patch], options)
}

function gitPopWithConflicts(options) {
  return execGit(['stash'], options) // Stash auto-fixes
    .then(() => execGit(['stash', 'pop', 'stash@{1}'], options)) // Apply initial stash first
    .then(() => execGit(['read-tree', 'stash'], options)) // Merge with auto-fixes
}

function cleanup(options) {
  console.info('Patch applied! Cleaning up...')
  return execGit(['stash', 'drop'], options)
    .then(() => fsp.unlink(patchPath))
    .then(() => {
      patchPath = null
    })
}

function gitApplyPatch(patch, options) {
  console.log('Applying patch...')
  return gitApply(patch, options)
    .then(() => cleanup(options))
    .catch(() => {
      console.warn('Stashed changes conflicted with hook auto-fixes! Restoring from conflicts...')
      return gitPopWithConflicts(options).then(() => cleanup(options))
    })
}

function gitStashSave(options) {
  return generatePatch(options)
    .then(res => {
      patchPath = res // Save the reference to the path
    })
    .then(() => execGit(['stash', '--keep-index'], options))
}

function gitStashPop(options) {
  if (!patchPath) {
    throw new Error('No patch found')
  }
  return execGit(['checkout', '--', '.'], options).then(() => gitApplyPatch(patchPath, options))
}

module.exports = {
  getAbsolutePath,
  getCmdArgs,
  execGit,
  gitStashSave,
  gitStashPop,
  hasUnstagedFiles,
  getUnstagedFiles,
  getStagedFiles,
  hasPartiallyStagedFiles
}
