import path from 'path'
import { fileURLToPath } from 'url'

import { execa } from 'execa'
import fs from 'fs-extra'

import { execGit as execGitBase } from '../../lib/execGit'

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
    await fs.writeFile(filepath, content)
  }

  // Remove file
  const removeFile = async (filename, dir = cwd) => {
    const filepath = path.isAbsolute(filename) ? filename : path.join(dir, filename)
    await fs.remove(filepath)
  }

  // Wrap execGit to always pass `gitOps`
  const execGit = async (args, options = {}) => execGitBase(args, { cwd, ...options })

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const lintStagedBin = path.resolve(__dirname, '../../bin/lint-staged.js')

  // Execute lintStaged before git commit to emulate lint-staged cli
  const gitCommit = async (options, dir = cwd) => {
    const lintStagedArgs = Array.isArray(options?.lintStaged) ? options.lintStaged : []
    const gitCommitArgs = Array.isArray(options?.gitCommit) ? options.gitCommit : ['-m test']

    const { all, exitCode } = await execa(lintStagedBin, lintStagedArgs, { cwd: dir, all: true })

    if (exitCode !== 0) throw all

    await execGit(['commit', ...gitCommitArgs], { cwd: dir, ...options })

    return all
  }

  return { appendFile, execGit, gitCommit, readFile, removeFile, writeFile }
}

export const withGitIntegration =
  (testCase, initialCommit = true) =>
  async () => {
    const cwd = await createTempDir()

    const utils = getGitUtils(cwd)

    // Init repository with initial commit
    await utils.execGit('init')
    if (isWindowsActions()) await utils.execGit(['config', 'core.autocrlf', 'input'])
    await utils.execGit(['config', 'user.name', '"test"'])
    await utils.execGit(['config', 'user.email', '"test@test.com"'])
    await utils.execGit(['config', 'merge.conflictstyle', 'merge'])

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
  }
