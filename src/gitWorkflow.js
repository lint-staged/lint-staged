'use strict'

const path = require('path')
const execa = require('execa')
const fsp = require('fs-promise')
const debug = require('debug')('lint-staged:git')

let workTree = null
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

async function generatePatchForTrees(treesArray, options) {
  const cwd = options && options.cwd ? options.cwd : process.cwd()
  const tree = await writeTree(options)
  if (tree) {
    const patch = await execGit(
      ['diff-tree', '--ignore-submodules', '--binary', '--no-color', '--no-ext-diff'].concat(treesArray),
      options
    )
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
  const formattedTree = await writeTree(options);
  const patchLocation = await generatePatchForTrees([trees[0], formattedTree], options)

  if (patchLocation) {
    // Apply formatter changes to the stashed tree
    // Get the stashed tree
    await execGit(['read-tree', workTree], options)
    // Apply patch with only formatting changes
    try {
      await execGit(['apply', '--whitespace=nowarn', '-v', '--cached', patchLocation], options)
      // Update the tree sha reference
      workTree = await writeTree(options);
      // Get the formatted tree back
      await execGit(['read-tree', formattedTree], options)
      //  Delete patch file
      await fsp.unlink(patchLocation)
    } catch (err) {
      debug('Oops! Could not apply patch to the working copy. There are conflicts between formatters and your changes. Will ignore formatters.')
      // In case patch can't be applied, this means a conflict going to occur between user modifications and formatter
      // In this case, we want to skip formatting and restore user modifications and previous index
      // To do so we won't add formmattedTree to the array so it's not restored in the index
      return
    }
  }
  trees = [...trees, formattedTree]
}

// eslint-disable-next-line
async function gitPop(options) {
  if (!workTree || !trees.length) {
    throw new Error('Need 2 tree-ish to be set!')
  }
  // Restore the stashed files in the index
  await execGit(['read-tree', workTree], options)
  // and sync it to working copy
  await execGit(['checkout-index', '-af'], options)

  if (trees.length === 1) {
    // Restore changes that were in index
    await execGit(['read-tree', trees[0]], options)
  } else {
    // Or, apply formatted changes
    await execGit(['read-tree', trees[1]], options)
  }
}

async function gitStashSave(options) {
  return gitStash(options)
}

function gitStashPop(options) {
  return gitPop(options)
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
