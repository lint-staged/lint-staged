#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Option, program } from 'commander'
import debug from 'debug'

import { forceTty } from '../lib/forceTty.js'

// Force `process.stdout` to be a TTY to support spinners
const ttyHandle = await forceTty()
if (ttyHandle) {
  process.env.FORCE_COLOR = '1'
}

// Do not terminate main Listr process on SIGINT
process.on('SIGINT', () => {})

const packageJsonPath = path.join(fileURLToPath(import.meta.url), '../../package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath))
const version = packageJson.version

const debugLog = debug('lint-staged:bin')
debugLog('Running `lint-staged@%s`', version)

const cli = program.version(version)

cli.option('--allow-empty', 'allow empty commits when tasks revert all staged changes', false)

cli.option(
  '-p, --concurrent <number|boolean>',
  'the number of tasks to run concurrently, or false for serial',
  true
)

cli.option('-c, --config [path]', 'path to configuration file, or - to read from stdin')

cli.option('--cwd [path]', 'run all tasks in specific directory, instead of the current')

cli.option('-d, --debug', 'print additional debug information', false)

cli.option(
  '--diff [string]',
  'override the default "--staged" flag of "git diff" to get list of files. Implies "--no-stash".'
)

cli.option(
  '--diff-filter [string]',
  'override the default "--diff-filter=ACMR" flag of "git diff" to get list of files'
)

cli.option('--max-arg-length [number]', 'maximum length of the command-line argument string', 0)

/**
 * We don't want to show the `--stash` flag because it's on by default, and only show the
 * negatable flag `--no-stash` in stead. There seems to be a bug in Commander.js where
 * configuring only the latter won't actually set the default value.
 */
cli
  .addOption(
    new Option('--stash', 'enable the backup stash, and revert in case of errors')
      .default(true)
      .hideHelp()
  )
  .addOption(
    new Option(
      '--no-stash',
      'disable the backup stash, and do not revert in case of errors'
    ).default(false)
  )

cli.option('-q, --quiet', 'disable lint-staged’s own console output', false)

cli.option('-r, --relative', 'pass relative filepaths to tasks', false)

cli.option('-x, --shell [path]', 'skip parsing of tasks for better shell support', false)

cli.option(
  '-v, --verbose',
  'show task output even when tasks succeed; by default only failed output is shown',
  false
)

const cliOptions = cli.parse(process.argv).opts()

if (cliOptions.debug) {
  debug.enable('lint-staged*')
}

const options = {
  allowEmpty: !!cliOptions.allowEmpty,
  concurrent: JSON.parse(cliOptions.concurrent),
  configPath: cliOptions.config,
  cwd: cliOptions.cwd,
  debug: !!cliOptions.debug,
  diff: cliOptions.diff,
  diffFilter: cliOptions.diffFilter,
  maxArgLength: cliOptions.maxArgLength || undefined,
  quiet: !!cliOptions.quiet,
  relative: !!cliOptions.relative,
  shell: cliOptions.shell /* Either a boolean or a string pointing to the shell */,
  stash: !!cliOptions.stash, // commander inverts `no-<x>` flags to `!x`
  verbose: !!cliOptions.verbose,
}

debugLog('Options parsed from command-line:', options)

if (options.configPath === '-') {
  delete options.configPath
  try {
    options.config = fs.readFileSync(process.stdin.fd, 'utf8').toString().trim()
  } catch {
    // Lazy import so that `colorette` is not loaded before `forceTty`
    const { CONFIG_STDIN_ERROR } = await import('../lib/messages.js')
    console.error(CONFIG_STDIN_ERROR)
    process.exit(1)
  }

  try {
    options.config = JSON.parse(options.config)
  } catch {
    // Let config parsing complain if it's not JSON
  }
}

try {
  const { default: lintStaged } = await import('../lib/index.js')
  const passed = await lintStaged(options)
  process.exitCode = passed ? 0 : 1
} catch {
  process.exitCode = 1
} finally {
  if (ttyHandle) {
    fs.closeSync(ttyHandle)
  }
}
