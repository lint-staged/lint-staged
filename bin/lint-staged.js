#!/usr/bin/env node

import { userInfo } from 'node:os'

import { supportsColor } from 'chalk'
import { Option, program } from 'commander'
import debug from 'debug'

import lintStaged from '../lib/index.js'
import { CONFIG_STDIN_ERROR, RESTORE_STASH_EXAMPLE } from '../lib/messages.js'
import { readStdin } from '../lib/readStdin.js'
import { getVersion } from '../lib/version.js'

// Force colors for packages that depend on https://www.npmjs.com/package/supports-color
if (supportsColor) {
  process.env.FORCE_COLOR = supportsColor.level.toString()
}

const debugLog = debug('lint-staged:bin')

// Do not terminate main Listr process on SIGINT
process.on('SIGINT', () => {})

program.version(await getVersion())

/**
 * This shouldn't be necessary for lint-staged, but add migration step just in case
 * to preserve old behavior of "commander".
 *
 * @todo remove this in the major version
 * @see https://github.com/tj/commander.js/releases/tag/v13.0.0
 * */
program.allowExcessArguments()

program.option('--allow-empty', 'allow empty commits when tasks revert all staged changes', false)

program.option(
  '-p, --concurrent <number|boolean>',
  'the number of tasks to run concurrently, or false for serial',
  true
)

program.option('-c, --config [path]', 'path to configuration file, or - to read from stdin')

program.option('--cwd [path]', 'run all tasks in specific directory, instead of the current')

program.option('-d, --debug', 'print additional debug information', false)

program.addOption(
  new Option(
    '--diff [string]',
    'override the default "--staged" flag of "git diff" to get list of files. Implies "--no-stash".'
  ).implies({ stash: false })
)

program.option(
  '--diff-filter [string]',
  'override the default "--diff-filter=ACMR" flag of "git diff" to get list of files'
)

program.option('--max-arg-length [number]', 'maximum length of the command-line argument string', 0)

/**
 * We don't want to show the `--revert` flag because it's on by default, and only show the
 * negatable flag `--no-rever` instead. There seems to be a bug in Commander.js where
 * configuring only the latter won't actually set the default value.
 */
program
  .addOption(
    new Option('--revert', 'revert to original state in case of errors').default(true).hideHelp()
  )
  .addOption(
    new Option('--no-revert', 'do not revert to original state in case of errors.').default(false)
  )

program
  .addOption(new Option('--stash', 'enable the backup stash').default(true).hideHelp())
  .addOption(
    new Option('--no-stash', 'disable the backup stash. Implies "--no-revert".')
      .default(false)
      .implies({ revert: false })
  )

program
  .addOption(
    new Option('--hide-partially-staged', 'hide unstaged changes from partially staged files')
      .default(true)
      .hideHelp()
  )
  .addOption(
    new Option(
      '--no-hide-partially-staged',
      'disable hiding unstaged changes from partially staged files'
    ).default(false)
  )

program.option('-q, --quiet', 'disable lint-staged’s own console output', false)

program.option('-r, --relative', 'pass relative filepaths to tasks', false)

program.option(
  '-v, --verbose',
  'show task output even when tasks succeed; by default only failed output is shown',
  false
)

program.addHelpText('afterAll', '\n' + RESTORE_STASH_EXAMPLE)

const cliOptions = program.parse(process.argv).opts()

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
  revert: !!cliOptions.revert, // commander inverts `no-<x>` flags to `!x`
  stash: !!cliOptions.stash, // commander inverts `no-<x>` flags to `!x`
  hidePartiallyStaged: !!cliOptions.hidePartiallyStaged, // commander inverts `no-<x>` flags to `!x`
  verbose: !!cliOptions.verbose,
}

try {
  const { shell } = userInfo()
  debugLog('Using shell: %s', shell)
} catch {
  debugLog('Could not determine current shell')
}

debugLog('Options parsed from command-line: %o', options)

if (options.configPath === '-') {
  delete options.configPath
  try {
    debugLog('Reading config from stdin')
    options.config = JSON.parse(await readStdin())
  } catch (error) {
    debugLog(CONFIG_STDIN_ERROR, error)
    console.error(CONFIG_STDIN_ERROR)
    process.exit(1)
  }
}

try {
  const passed = await lintStaged(options)
  process.exitCode = passed ? 0 : 1
} catch {
  process.exitCode = 1
}
