'use strict'

const path = require('path')
const execa = require('execa')
const fsp = require('fs-promise')
const debug = require('debug')('lint-staged:git')

let patchPath
let indexTree = null
let workTree = null
let hooksTree = null
let trees = []

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
  debug('Running git command', cmd)
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

function hasUnstagedFiles(options) {
  return getUnstagedFiles(options).then(files => files.length > 0)
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
      debug('Nothing to do...')
    })
    .catch(res => {
      debug('Unstaged files detected.')
      const patch = res.stdout
      const filePath = path.join(cwd, '.lint-staged.patch')
      debug(`Stashing unstaged files to ${filePath}...`)
      return fsp.writeFile(filePath, patch).then(() => filePath) // Resolve with filePath
    })
}

function gitApply(patch, options) {
  return execGit(['apply', '--whitespace=nowarn', patch], options)
}

function gitPopWithConflicts(options) {
  return (
    execGit(['stash'], options) // Stash auto-fixes
      // .then((res) => console.log(res.stdout))
      .then(() => execGit(['stash', 'pop', 'stash@{1}'], options)) // Apply initial stash first
      // .then(() => execGit(['stash', 'pop', 'stash@{0}'], options)) // Apply initial stash first
      // .then((res) => console.log(res.stdout))
      .then(() => execGit(['read-tree', 'stash'], options))
  ) // Merge with auto-fixes
}

async function writeTree(options) {
  const { stdout } = await execGit(['write-tree'], options)
  return stdout
}

async function gitStash(options) {
  debug('Stashing files...')
  // Save ref to the current index
  trees = [await writeTree(options)]
  // Add working copy changes to index
  await execGit(['add', '.'], options)
  // Save ref to the working copy index
  workTree = await writeTree(options)
  // Restore the current index
  await execGit(['read-tree', trees[0]], options)
  // Remove all modifications
  await execGit(['checkout-index', '-af'], options)
  // await execGit(['clean', '-dfx'], options)
  debug('Done stashing files!')
  return Promise.resolve(null)
}

async function updateStash(options) {
  // patchPath = await generatePatch(options)
  // await execGit(['update-index', '--refresh'], options)
  trees = [...trees, await writeTree(options)]
}

async function gitPop(options) {
  if (!workTree || !trees.length) {
    throw new Error('Need 2 tree-ish to be set!')
  }
  // Restore working copy from the saved index
  await execGit(['read-tree', workTree], options)
  // Sync index to working copy
  await execGit(['checkout-index', '-af'], options)
  // Apply changes from previous current index
  if (trees.length === 1) {
    await execGit(['read-tree', trees[0]], options)
  } else {
    // await execGit(['read-tree', '-m', '-i', trees[0]], options)
    // await execGit(['checkout-index', '-f'], options)
    // await execGit(['clean', '-dfx'], options)
    await execGit(['read-tree', trees[1]], options)
  }
  // Sync index to working copy
  await execGit(['checkout-index'], options)
  // await execGit(['read-tree', '-m', '-i', trees[1]], options)
  // if (patchPath) {
  //   await gitApply(patchPath, options)
  // }
}

function cleanup(options) {
  debug('Patch applied! Cleaning up...')
  return execGit(['stash', 'drop'], options)
    .then(() => fsp.unlink(patchPath))
    .then(() => {
      patchPath = null
    })
}

function gitApplyPatch(patch, options) {
  debug('Applying patch...')
  return gitApply(patch, options)
    .then(() => cleanup(options))
    .catch(() => {
      debug('Stashed changes conflicted with hook auto-fixes! Restoring from conflicts...')
      return gitPopWithConflicts(options).then(() => cleanup(options))
    })
}

function gitStashSave(options) {
  debug('Checking if there are unstaged files in the working directory')
  return hasUnstagedFiles(options).then(hasUnstaged => {
    if (hasUnstaged) {
      debug('Found unstaged files. Will need to stash them...')
      return gitStash(options)
      // return generatePatch(options)
      //   .then(res => {
      //     patchPath = res // Save the reference to the patch
      //   })
      //   .then(() => execGit(['stash', '--keep-index'], options))
    }
    return Promise.resolve(null)
  })
}

function gitStashPop(options) {
  return gitPop(options)
  // if (!patchPath) {
  //   throw new Error('No patch found')
  // }
  // return execGit(['checkout', '--', '.'], options).then(() => gitApplyPatch(patchPath, options))
}

module.exports = {
  getCmdArgs,
  execGit,
  gitStashSave,
  gitStashPop,
  hasUnstagedFiles,
  getUnstagedFiles,
  updateStash
}
