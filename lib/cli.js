import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { restoreStashExample } from './messages.js'

const CLI_OPTIONS = [
  {
    short: 'h',
    flag: 'help',
    type: 'boolean',
    description: 'display this help message',
  },
  {
    short: 'V',
    flag: 'version',
    type: 'boolean',
    description: 'display the current version number',
  },
  {
    flag: 'allow-empty',
    type: 'boolean',
    description: 'allow empty commits when tasks revert all staged changes (default: false)',
  },
  {
    short: 'p',
    flag: 'concurrent',
    positional: '<number|boolean>',
    type: 'string',
    description: 'the number of tasks to run concurrently, or false for serial (default: true)',
  },
  {
    short: 'c',
    flag: 'config',
    positional: '[path]',
    type: 'string',
    description: 'path to configuration file, or - to read from stdin',
  },
  {
    flag: 'continue-on-error',
    type: 'boolean',
    description: 'run all tasks to completion even if one fails (default: false)',
  },
  {
    flag: 'cwd',
    positional: '[path]',
    type: 'string',
    description: 'run all tasks in specific directory, instead of the current',
  },
  {
    short: 'd',
    flag: 'debug',
    type: 'boolean',
    description: 'print additional debug information (default: false)',
  },
  {
    flag: 'diff',
    positional: '[string]',
    type: 'string',
    description:
      'override the default "--staged" flag of "git diff" to get list of files. Implies "--no-stash".',
  },
  {
    flag: 'diff-filter',
    positional: '[string]',
    type: 'string',
    description:
      'override the default "--diff-filter=ACMR" flag of "git diff" to get list of files',
  },
  {
    flag: 'fail-on-changes',
    type: 'boolean',
    description: 'fail with exit code 1 when tasks modify tracked files (default: false)',
  },
  {
    negative: true,
    flag: 'hide-partially-staged',
    type: 'boolean',
    description: 'hide unstaged changes from partially staged files (default: true)',
  },
  {
    flag: 'hide-unstaged',
    type: 'boolean',
    description: 'hide all unstaged changes, instead of just partially staged (default: false)',
  },
  {
    flag: 'max-arg-length',
    type: 'string', // Parsed with `parseInt()` below
    positional: '[number]',
    description: 'maximum length of the command-line argument string (default: 0)',
  },
  {
    short: 'q',
    flag: 'quiet',
    type: 'boolean',
    description: "disable lint-staged's own console output (default: false)",
  },
  {
    short: 'r',
    flag: 'relative',
    type: 'boolean',
    description: 'pass relative filepaths to tasks (default: false)',
  },
  {
    negative: true,
    flag: 'revert',
    type: 'boolean',
    description: 'revert to original state in case of errors (default: true)',
  },
  {
    negative: true,
    flag: 'stash',
    type: 'boolean',
    description: 'enable the backup stash (default: true)',
  },
  {
    short: 'v',
    flag: 'verbose',
    type: 'boolean',
    description:
      'show task output even when tasks succeed; by default only failed output is shown (default: false)',
  },
]

/** @param {string[]} argv */
export const parseCliOptions = (argv) => {
  const options = CLI_OPTIONS.reduce((acc, current) => {
    acc[current.flag] = { type: current.type }
    if (current.short) acc[current.flag].short = current.short
    return acc
  }, {})

  const { values } = parseArgs({
    args: argv,
    allowNegative: true,
    allowPositionals: true,
    options,
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

  if (values['hide-unstaged'] !== undefined) {
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
    maxArgLength: parseInt(values['max-arg-length'], 10),
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

const helpOptions = CLI_OPTIONS.map((option) => {
  if (option.negative) {
    /** @example `--no-stash` */
    return [`--no-${option.flag}`, option.description]
  }

  /**
   * @example `-V, --version
   * or
   * @example `--allow-empty`
   */
  let arg = option.short ? `-${option.short}, --${option.flag}` : `--${option.flag}`

  /** @example `--cwd [path]` */
  if (option.positional) arg += ` ${option.positional}`

  return [arg, option.description]
})

const createWrap = (width) => {
  const regExp = new RegExp(`.{1,${width}}(\\s|$)`, 'g')
  return (text) => text.match(regExp)?.map((s) => s.trimEnd())
}

export const printHelpText = async (width = process.stdout.columns) => {
  const output = ['Usage: lint-staged [options]\n']

  const col1Width = Math.max(...helpOptions.map(([arg]) => arg.length)) + 2
  const wrap = createWrap(width - col1Width)

  for (const [arg, description] of helpOptions) {
    const lines = wrap(description)
    const pad = ' '.repeat(col1Width)
    output.push(arg.padEnd(col1Width) + lines[0], ...lines.slice(1).map((line) => pad + line))
  }

  output.push('\n' + restoreStashExample())

  return output.join('\n')
}
