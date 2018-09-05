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

async function getDiffForTrees(tree1, tree2, options) {
  return execGit(
    [
      'diff-tree',
      '--ignore-submodules',
      '--binary',
      '--no-color',
      '--no-ext-diff',
      '--unified=0',
      tree1,
      tree2
    ],
    options
  )
}

async function getUnstagedFiles(options) {
  const tree = await writeTree(options)
  if (tree) {
    const files = await execGit(['diff-index', '--name-only', tree, '--'], options)
    return files.split('\n').filter(Boolean) // Remove empty strings
  }
  return []
}

function hasUnstagedFiles(options) {
  return getUnstagedFiles(options).then(files => files.length > 0)
}

async function generatePatchForTrees(treesArray, options) {
  // TODO: Use stdin instead of the file for patches
  const cwd = options && options.cwd ? options.cwd : process.cwd()
  const patch = await getDiffForTrees(treesArray[0], treesArray[1], options)
  if (patch.length) {
    const filePath = path.join(cwd, '.lint-staged.patch')
    debug(`Stashing unstaged files to ${filePath}...`)
    await fsp.writeFile(filePath, `${patch}\n`) // The new line is somehow required for patch to not be corrupted
    return filePath // Resolve with filePath
  }
  debug('Nothing to do...')
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
  trees = [...trees, await writeTree(options)]
}

async function applyPathFor(tree1, tree2, options) {
  const patchPath = await generatePatchForTrees([tree1, tree2], options)
  if (patchPath) {
    try {
      /**
       * Apply patch to index. We will apply it with --reject so it it will try apply hunk by hunk
       * We're not interested in failied hunks since this mean that formatting conflicts with user changes
       * and we prioritize user changes over formatter's
       */
      await execGit(
        [
          'apply',
          '-v',
          '--whitespace=nowarn',
          '--reject',
          '--recount',
          '--unidiff-zero',
          patchPath
        ],
        options
      )
    } catch (err) {
      debug('Could not apply patch to the stashed files cleanly')
      debug(err)
      debug('Patch content:')
      debug(await fsp.readFile(patchPath, { encoding: 'utf-8' }))
      throw new Error('Could not apply patch to the stashed files cleanly.', err)
    } finally {
      // Delete patch file
      await fsp.unlink(patchPath)
    }
  }
}

async function gitPop(options) {
  if (!workTree || !trees.length) {
    throw new Error('Need 2 tree-ish to be set!')
  }

  // Restore the stashed files in the index
  await execGit(['read-tree', workTree], options)
  // and sync it to the working copy (i.e. update files on fs)
  await execGit(['checkout-index', '-af'], options)

  // Then, restore the index after working copy is restored
  if (trees.length === 1) {
    // Restore changes that were in index if there are no formatting changes
    await execGit(['read-tree', trees[0]], options)
  } else {
    /**
     * There are formatting changes we want to restore in the index
     * and in the working copy. So we start by restoring the index
     * and after that we'll try to carry as many as possible changes
     * to the working copy by applying the patch with --reject option.
     */
    await execGit(['read-tree', trees[1]], options)
    try {
      await applyPathFor(trees[0], trees[1], options)
    } catch (err) {
      console.log(
        'WARNING! Found conflicts between formatters and local changes. Formatters changes will be ignored for conflicted hunks.'
      )
    }
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
