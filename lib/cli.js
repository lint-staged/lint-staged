import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { restoreStashExample } from './messages.js'

/** @param {string[]} argv */
export const parseCliOptions = (argv) => {
  const { values } = parseArgs({
    args: argv,
    allowNegative: true,
    allowPositionals: true,
    options: {
      'allow-empty': { type: 'boolean' },
      concurrent: { type: 'string', short: 'p' },
      config: { type: 'string', short: 'c' },
      'continue-on-error': { type: 'boolean' },
      cwd: { type: 'string' },
      debug: { type: 'boolean', short: 'd' },
      diff: { type: 'string' },
      'diff-filter': { type: 'string' },
      'fail-on-changes': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      'hide-partially-staged': { type: 'boolean' },
      'hide-unstaged': { type: 'boolean' },
      'max-arg-length': { type: 'string' },
      quiet: { type: 'boolean', short: 'q' },
      relative: { type: 'boolean', short: 'r' },
      revert: { type: 'boolean' },
      stash: { type: 'boolean' },
      verbose: { type: 'boolean', short: 'v' },
      version: { type: 'boolean', short: 'V' },
    },
  })

  if (values.diff !== undefined && values.stash === undefined) {
    /** Disable stashing by default when diffing specific value */
    values.stash = false
  }

  if (values['fail-on-changes'] && values.revert === undefined) {
    /** When using --fail-on-changes, default to not reverting on errors */
    values.revert = false
  }

  if (values.stash === false && values.revert === undefined) {
    /** Can't revert when using --no-stash */
    values.revert = false
  }

  if (values['hide-unstaged']) {
    /** Redundant, since above includes this */
    values['hide-partially-staged'] = false
  }

  return {
    allowEmpty: values['allow-empty'] ?? false,
    concurrent: values.concurrent === undefined ? true : JSON.parse(values.concurrent),
    configPath: values.config,
    continueOnError: !!values['continue-on-error'],
    cwd: values.cwd,
    debug: !!values.debug,
    diff: values.diff,
    diffFilter: values['diff-filter'],
    failOnChanges: !!values['fail-on-changes'],
    help: !!values.help,
    hidePartiallyStaged: values['hide-partially-staged'] ?? true,
    hideUnstaged: !!values['hide-unstaged'],
    maxArgLength: parseInt(values['max-arg-length']),
    quiet: !!values.quiet,
    relative: !!values.relative,
    revert: values.revert ?? true,
    stash: values.stash ?? true,
    verbose: !!values.verbose,
    version: !!values.version,
  }
}

export const getVersionNumber = async () => {
  const dirname = path.dirname(fileURLToPath(import.meta.url))
  const packageJsonFile = await readFile(path.join(dirname, '../package.json'), 'utf-8')
  /** @type {import('../package.json')} */
  const packageJson = JSON.parse(packageJsonFile)

  return packageJson.version
}

const helpOptions = [
  ['-V, --version', 'output the version number'],
  ['--allow-empty', 'allow empty commits when tasks revert all staged changes (default: false)'],
  [
    '-p, --concurrent <number|boolean>',
    'the number of tasks to run concurrently, or false for serial (default: true)',
  ],
  ['-c, --config [path]', 'path to configuration file, or - to read from stdin'],
  ['--cwd [path]', 'run all tasks in specific directory, instead of the current'],
  ['-d, --debug', 'print additional debug information (default: false)'],
  [
    '--diff [string]',
    'override the default "--staged" flag of "git diff" to get list of files. Implies "--no-stash".',
  ],
  [
    '--diff-filter [string]',
    'override the default "--diff-filter=ACMR" flag of "git diff" to get list of files',
  ],
  ['--continue-on-error', 'run all tasks to completion even if one fails (default: false)'],
  ['--fail-on-changes', 'fail with exit code 1 when tasks modify tracked files (default: false)'],
  ['--max-arg-length [number]', 'maximum length of the command-line argument string (default: 0)'],
  ['--no-revert', 'do not revert to original state in case of errors.'],
  ['--no-stash', 'disable the backup stash. Implies "--no-revert".'],
  ['--no-hide-partially-staged', 'disable hiding unstaged changes from partially staged files'],
  [
    '--hide-unstaged',
    'hide all unstaged changes, instead of just partially staged (default: false)',
  ],
  ['-q, --quiet', "disable lint-staged's own console output (default: false)"],
  ['-r, --relative', 'pass relative filepaths to tasks (default: false)'],
  [
    '-v, --verbose',
    'show task output even when tasks succeed; by default only failed output is shown (default: false)',
  ],
  ['-h, --help', 'display help for command'],
]

const wrap = (text, width) =>
  text.match(new RegExp(`.{1,${width}}(\\s|$)`, 'g')).map((s) => s.trimEnd())

export const printHelpText = async () => {
  const columns = process.stdout.columns

  const output = ['Usage: lint-staged [options]\n']

  const col1Width = Math.max(...helpOptions.map(([arg]) => arg.length)) + 2

  for (const [arg, description] of helpOptions) {
    const lines = wrap(description, columns - col1Width)
    const pad = ' '.repeat(col1Width)
    output.push(arg.padEnd(col1Width) + lines[0], ...lines.slice(1).map((line) => pad + line))
  }

  output.push('\n' + restoreStashExample())

  return output.join('\n')
}
