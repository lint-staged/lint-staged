import path from 'path'

import fs from 'fs-extra'

import { execGit as execGitBase } from '../../../lib/execGit'
import lintStaged from '../../../lib/index'

import { createTempDir } from './tempDir'
import { isWindowsActions } from './gitHubActions'
import { normalizeWindowsNewlines } from './windowsNewLines'

const ensureDir = async (inputPath) => fs.ensureDir(path.parse(inputPath).dir)

const getGitUtils = (cwd) => {
  if (!cwd || cwd === process.cwd()) {
    throw new Error('Do not run integration tests without an explicit Working Directory!')
  }

  // Get file content, coercing Windows `\r\n` newlines to `\n`
  const readFile = async (filename, dir = cwd) => {
    const filepath = path.isAbsolute(filename) ? filename : path.join(dir, filename)
    const file = await fs.readFile(filepath, { encoding: 'utf-8' })
    return normalizeWindowsNewlines(file)
  }

  // Append to file, creating if it doesn't exist
  const appendFile = async (filename, content, dir = cwd) => {
    const filepath = path.isAbsolute(filename) ? filename : path.join(dir, filename)
    await ensureDir(filepath)
    await fs.appendFile(filepath, content)
  }

  // Write (over) file, creating if it doesn't exist
  const writeFile = async (filename, content, dir = cwd) => {
    const filepath = path.isAbsolute(filename) ? filename : path.join(dir, filename)
    await ensureDir(filepath)
    fs.writeFile(filepath, content)
  }

  // Wrap execGit to always pass `gitOps`
  const execGit = async (args, options = {}) => execGitBase(args, { cwd, ...options })

  /**
   * Execute lintStaged before git commit to emulate lint-staged cli.
   * The Node.js API doesn't throw on failures, but will return `false`.
   */
  const gitCommit = async (options, args = ['-m test']) => {
    const passed = await lintStaged({ cwd, ...options })
    if (!passed) throw new Error('lint-staged failed')
    await execGit(['commit', ...args], { cwd, ...options })
  }

  return { readFile, appendFile, writeFile, execGit, gitCommit }
}

export const testWithGitIntegration = (message, testCase, initialCommit = true) => {
  test(message, async () => {
    const cwd = await createTempDir()

    const utils = getGitUtils(cwd)

    // Init repository with initial commit
    await utils.execGit('init')
    if (isWindowsActions()) await utils.execGit(['config', 'core.autocrlf', 'input'])
    await utils.execGit(['config', 'user.name', '"test"'])
    await utils.execGit(['config', 'user.email', '"test@test.com"'])

    if (initialCommit) {
      await utils.appendFile('README.md', '# Test\n')
      await utils.execGit(['add', 'README.md'])
      await utils.execGit(['commit', '-m initial commit'])
    }

    try {
      await testCase({ ...utils, cwd })
    } finally {
      await fs.remove(cwd)
    }
  })
}

export const itWithGitIntegration = testWithGitIntegration
