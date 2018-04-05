'use strict'

const path = require('path')
const execa = require('execa')
const fsp = require('fs-promise')
const debug = require('debug')('lint-staged:git')

let patchPath
let indexTree = null // eslint-disable-line
let workTree = null
let hooksTree = null // eslint-disable-line
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

async function execGit(cmd, options) {
  const cwd = options && options.cwd ? options.cwd : process.cwd()
  const gitDir = options && options.gitDir
  debug('Running git command', cmd)
  try {
    const { stdout } = await execa('git', getCmdArgs(gitDir).concat(cmd), {
      cwd: getAbsolutePath(cwd)
    })
    return stdout
  } catch (err) {
    throw new Error(err)
  }
}

async function writeTree(options) {
  return execGit(['write-tree'], options)
}

async function getUnstagedFiles(options) {
  const tree = await writeTree(options)
  if (tree) {
    const files = await execGit(['diff-index', '--name-only', tree, '--'], options)
    return files.split('\n')
  }
  return []
}

function hasUnstagedFiles(options) {
  return getUnstagedFiles(options).then(files => files.length > 0)
}

function gitApply(patch, options) {
  return execGit(['apply', '--whitespace=nowarn', patch], options)
}

async function generatePatch(options) {
  const cwd = options && options.cwd ? options.cwd : process.cwd()
  const tree = await writeTree(options)
  if (tree) {
    const patch = await execGit(
      ['diff-index', '--ignore-submodules', '--binary', '--no-color', '--no-ext-diff', tree, '--'],
      options
    )
    console.log(patch)
    if (patch.length) {
      debug('Unstaged files detected.')
      const filePath = path.join(cwd, '.lint-staged.patch')
      debug(`Stashing unstaged files to ${filePath}...`)
      await fsp.writeFile(filePath, patch)
      return filePath // Resolve with filePath
    }
    debug('Nothing to do...')
    return null
  }
  return null
}

async function gitPopWithConflicts(options) {
  await execGit(['stash'], options) // Stash auto-fixes
  await execGit(['stash', 'pop', 'stash@{1}'], options) // Apply initial stash first
  return execGit(['read-tree', '-m', '-i', 'stash'], options) // Merge with auto-fixes
}

// eslint-disable-next-line
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

// eslint-disable-next-line
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

async function cleanup(options) {
  debug('Patch applied! Cleaning up...')
  await execGit(['stash', 'drop'], options)
  await fsp.unlink(patchPath)
  patchPath = null
  debug('Clean up complete!')
}

async function gitApplyPatch(patch, options) {
  debug('Applying patch...')
  try {
    await execGit(['checkout', '--', '.'], options)
    await gitApply(patch, options)
  } catch (err) {
    debug('Stashed changes conflicted with hook auto-fixes! Restoring from conflicts...')
    console.log('Stashed changes conflicted with hook auto-fixes! Restoring from conflicts...')
    await gitPopWithConflicts(options)
  }
  return cleanup(options)
}

async function gitStashSave(options) {
  debug('Checking if there are unstaged files in the working directory')
  const hasUnstaged = await hasUnstagedFiles(options)
  if (hasUnstaged) {
    debug('Found unstaged files. Will need to stash them...')
    patchPath = await generatePatch(options) // Save the reference to the patch
    return execGit(['stash', '--keep-index'], options)
  }
  return Promise.resolve(null)
}

function gitStashPop(options) {
  // return gitPop(options)
  if (patchPath) {
    return gitApplyPatch(patchPath, options)
  }
  debug('No patch found')
  return null
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
