import fs from 'node:fs/promises'
import path from 'node:path'

import makeConsoleMock from 'consolemock'

import { execGit as execGitBase } from '../../../lib/execGit.js'
import lintStaged from '../../../lib/index.js'
import { createTempDir } from '../../__utils__/createTempDir.js'
import { isWindowsActions } from './isWindows'
import { normalizeWindowsNewlines } from './normalizeWindowsNewlines.js'

const ensureDir = async (inputPath) => {
  const parsed = path.parse(inputPath)
  await fs.mkdir(parsed.dir, { recursive: true })
}

const getGitUtils = (cwd) => {
  if (!cwd || cwd === process.cwd()) {
    throw new Error('Do not run integration tests without an explicit Working Directory!')
  }

  /**
   * Get file content, coercing Windows `\r\n` newlines to `\n`
   *
   * @param {string} filename relative to the working directory
   * @param {string} [dir] the working directory, by default CWD
   * @returns {Promise<string>} file content
   */
  const readFile = async (filename, dir = cwd) => {
    const filepath = path.resolve(dir, filename)

    try {
      const file = await fs.readFile(filepath, { encoding: 'utf-8' })
      return normalizeWindowsNewlines(file)
    } catch (error) {
      console.error(`Failed to read file "${filepath}" with error:`, error)
      throw error
    }
  }

  /**
   * Append content to file, creating if it doesn't exist
   *
   * @param {string} filename relative to the working directory
   * @param {string} content
   * @param {string} [dir] the working directory, by default CWD
   * @returns {Promise<void>}
   */
  const appendFile = async (filename, content, dir = cwd) => {
    const filepath = path.resolve(dir, filename)

    try {
      await ensureDir(filepath)
      await fs.appendFile(filepath, content, { encoding: 'utf-8' })
    } catch (error) {
      console.error(`Failed to append file "${filepath}" with error:`, error)
      throw error
    }
  }

  /**
   * Write (over) file, creating if it doesn't exist
   *
   * @param {string} filename relative to the working directory
   * @param {string} content
   * @param {string} [dir] the working directory, by default CWD
   * @returns {Promise<void>}
   */
  const writeFile = async (filename, content, dir = cwd) => {
    const filepath = path.resolve(dir, filename)

    try {
      await ensureDir(filepath)
      await fs.writeFile(filepath, content, { encoding: 'utf-8' })
    } catch (error) {
      console.error(`Failed to write file "${filepath}" with error:`, error)
      throw error
    }
  }

  /**
   * Remove file
   *
   * @param {string} filename relative to the working directory
   * @param {string} [dir] the working directory, by default CWD
   * @returns {Promise<void>}
   */
  const removeFile = async (filename, dir = cwd) => {
    const filepath = path.resolve(dir, filename)

    try {
      await fs.rm(filepath, { recursive: true })
    } catch (error) {
      console.error(`Failed to remove file "${filepath}" with error:`, error)
      throw error
    }
  }

  /**
   * Wrap execGit to always pass `cwd`
   *
   * @param {Parameters<typeof execGitBase>[0]} args
   * @param {Parameters<typeof execGitBase>[1]} [options]
   */
  const execGit = async (args, options = {}) => execGitBase(args, { cwd, ...options })

  /**
   * Execute lintStaged before git commit to emulate lint-staged cli
   *
   * @typedef {import('../../../lib/index.d.ts').Options} LintStagedOptions
   * @typedef {{ lintStaged: LintStagedOptions, gitCommit: string[] }} Options
   *
   * @param {Options} [options]
   * @param {string} [dir] the working directory, by default CWD
   *
   * @returns the cli output
   */
  const gitCommit = async (options, dir = cwd) => {
    const globalConsoleTemp = console
    const logger = makeConsoleMock()

    // Override global console because of Listr2
    console = logger

    const passed = await lintStaged({ ...options?.lintStaged, cwd: dir }, logger)

    // Restore global console
    console = globalConsoleTemp

    if (!passed) throw new Error(logger.printHistory())

    const gitCommitArgs = Array.isArray(options?.gitCommit) ? options.gitCommit : ['-m test']
    await execGit(['commit', ...gitCommitArgs], { cwd: dir })

    return logger.printHistory()
  }

  return { appendFile, execGit, gitCommit, readFile, removeFile, writeFile }
}

/**
 * @typedef {import('vitest').ExpectStatic} Expect
 * @typedef {{ expect: Expect, cwd: string } & ReturnType<typeof getGitUtils} TestfunctionInput
 * @typedef {import('vitest').TestFunction<TestfunctionInput>} TestFunction
 * @typedef {{ initialCommit?: boolean }} IntegrationTestOptions
 *
 * @param {TestFunction} testFunction
 * @param {IntegrationTestOptions} options
 */
export const withGitIntegration =
  (testFunction, { initialCommit = true } = {}) =>
  async ({ expect }) => {
    const cwd = await createTempDir()

    const utils = getGitUtils(cwd)

    // Init repository with initial commit
    await utils.execGit(['init', '--initial-branch', 'main'])

    if (isWindowsActions()) {
      await utils.execGit(['config', 'core.autocrlf', 'input'])
    }

    await utils.execGit(['config', 'user.name', '"test"'])
    await utils.execGit(['config', 'user.email', '"test@test.com"'])
    await utils.execGit(['config', 'merge.conflictstyle', 'merge'])

    if (initialCommit) {
      await utils.appendFile('README.md', '# Test\n')
      await utils.execGit(['add', 'README.md'])
      await utils.execGit(['commit', '-m initial commit'])
    }

    try {
      await testFunction({ ...utils, expect, cwd })
    } finally {
      await fs.rm(cwd, { recursive: true })
    }
  }
