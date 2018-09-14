'use strict'

const path = require('path')
const execa = require('execa')
const fsp = require('fs-promise')
const debug = require('debug')('lint-staged:git')

let workingCopyTree = null
let indexTree = null
let formattedIndexTree = null

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

async function getFilesStatus(options) {
  const files = await execGit(['status', '--porcelain'], options)
  return files ? files.split('\n').filter(Boolean) : []
}

async function hasPartiallyStagedFiles(options) {
  const files = await getFilesStatus(options)
  const partiallyStaged = files.filter(file => file.startsWith('MM'))
  return partiallyStaged.length > 0
}

async function generatePatchForTrees(tree1, tree2, options) {
  // TODO: Use stdin instead of the file for patches
  const cwd = options && options.cwd ? options.cwd : process.cwd()
  const patch = await getDiffForTrees(tree1, tree2, options)
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
  indexTree = await writeTree(options)
  // Add working copy changes to index
  await execGit(['add', '.'], options)
  // Save ref to the working copy index
  workingCopyTree = await writeTree(options)
  // Restore the current index
  await execGit(['read-tree', indexTree], options)
  // Remove all modifications
  await execGit(['checkout-index', '-af'], options)
  // await execGit(['clean', '-dfx'], options)
  debug('Done stashing files!')
  return [workingCopyTree, indexTree]
}

async function updateStash(options) {
  formattedIndexTree = await writeTree(options)
  return formattedIndexTree
}

async function applyPathFor(tree1, tree2, options) {
  const patchPath = await generatePatchForTrees(tree1, tree2, options)
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
  if (workingCopyTree === null) {
    throw new Error('Trying to restore from stash but could not find working copy stash.')
  }

  debug('Restoring working copy')
  // Restore the stashed files in the index
  await execGit(['read-tree', workingCopyTree], options)
  // and sync it to the working copy (i.e. update files on fs)
  await execGit(['checkout-index', '-af'], options)

  // Then, restore the index after working copy is restored
  if (indexTree !== null && formattedIndexTree === null) {
    // Restore changes that were in index if there are no formatting changes
    debug('Restoring index')
    await execGit(['read-tree', indexTree], options)
  } else {
    /**
     * There are formatting changes we want to restore in the index
     * and in the working copy. So we start by restoring the index
     * and after that we'll try to carry as many as possible changes
     * to the working copy by applying the patch with --reject option.
     */
    debug('Restoring index with formatting changes')
    await execGit(['read-tree', formattedIndexTree], options)
    try {
      await applyPathFor(indexTree, formattedIndexTree, options)
    } catch (err) {
      debug(
        'Found conflicts between formatters and local changes. Formatters changes will be ignored for conflicted hunks.'
      )
    }
  }
  // Clean up references
  workingCopyTree = null
  indexTree = null
  formattedIndexTree = null

  return null
}

module.exports = {
  getCmdArgs,
  execGit,
  gitStashSave: gitStash,
  gitStashPop: gitPop,
  hasPartiallyStagedFiles,
  getFilesStatus,
  updateStash
}
