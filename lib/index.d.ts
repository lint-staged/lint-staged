import type { Configuration } from './config.d.ts'

export type { Configuration }

/** `lint-staged` Node.js API options */
export type Options = {
  /**
   * Include all files tracked in Git instead of only staged
   * @warn implies `stash: false` and `allowEmpty: true`
   * @default false
   */
  all?: boolean
  /**
   * Allow empty commits when tasks revert all staged changes
   * @default false
   */
  allowEmpty?: boolean
  /**
   * Enable or disable ANSI color codes in output. By default value is auto-detected
   * and controlled by `FORCE_COLOR` or `NO_COLOR` env variables.
   */
  color?: boolean
  /**
   * The number of tasks to run concurrently, or `false` to run tasks serially
   * @default true
   */
  concurrent?: boolean | number
  /**
   * Manual task configuration; disables automatic config file discovery when used
   */
  config?: Configuration
  /**
   * Path to single configuration file; disables automatic config file discovery when used
   */
  configPath?: string
  /**
   * Run all tasks to completion even if one fails
   * @default false
   */
  continueOnError?: boolean
  /**
   * Working directory to run all tasks in, defaults to current working directory
   */
  cwd?: string
  /**
   * Whether or not to enable debug output
   * @default false
   */
  debug?: boolean
  /**
   * Override the default `--staged` flag of `git diff` to get list of files.
   * @warn changing this also implies `stash: false`.
   * @example HEAD...origin/main
   */
  diff?: string
  /**
   * Override the default `--diff-filter=ACMR` flag of `git diff` to get list of files
   * @default "ACMR"
   */
  diffFilter?: string
  /**
   * Fail with exit code 1 when tasks modify tracked files
   * @default false
   */
  failOnChanges?: boolean
  /**
   * Maximum argument string length, by default automatically detected
   */
  maxArgLength?: number
  /**
   * Whether to hide unstaged changes from partially staged files before running tasks
   * @default true
   */
  hidePartiallyStaged?: boolean
  /**
   * Whether to hide all unstaged changes before running tasks
   * @default false
   */
  hideUnstaged?: boolean
  /**
   * Whether to hide all unstaged changes and untracked files before running tasks
   * @default false
   */
  hideAll?: boolean
  /**
   * Disable lint-staged’s own console output
   * @default false
   */
  quiet?: boolean
  /**
   * Pass filepaths relative to `CWD` to tasks, instead of absolute
   * @default false
   */
  relative?: boolean
  /**
   * Revert to original state in case of errors
   * @default true
   */
  revert?: boolean
  /**
   * Enable the backup stash, and revert in case of errors.
   * @warn Disabling this also implies `hidePartiallyStaged: false`.
   * @default true
   */
  stash?: boolean
  /**
   * Show task output even when tasks succeed; by default only failed output is shown
   * @default false
   */
  verbose?: boolean
}

type LogFunction = typeof console.log

export type Logger = {
  log: LogFunction
  warn: LogFunction
  error: LogFunction
  debug: LogFunction
}

/**
 * @returns {boolean} `true` when all tasks were successful, `false` when some tasks failed with errors
 * @throws {Error} when failed to some other errors
 */
export default function lintStaged(options: Options, logger?: Logger): Promise<boolean>
