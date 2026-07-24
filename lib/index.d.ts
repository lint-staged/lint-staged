/**
 * A single task that will be spawned
 *
 * @example "eslint --fix"
 */
type SpawnedTask = string

type SyncGenerateTask = (files: readonly string[]) => string | string[]

type AsyncGenerateTask = (files: readonly string[]) => Promise<string | string[]>

/**
 * A function that returns one or more tasks that will be spawned and run sequentially, in order.
 * The function receives list of the matched staged files as its argument. Can be sync or async.
 *
 * @example <caption>Return a command after manipulating list of staged files</caption>
 * (files: string) => `eslint --fix ${files.map((f) => `'${f}'`).join(' ')}`
 *
 * @example <caption>Ignore staged files and run "tsc" and "vitest" without any arguments</caption>
 * () => ['tsc', 'vitest']
 */
type GenerateTask = SyncGenerateTask | AsyncGenerateTask

/**
 * List of tasks that will be run in parallel
 *
 * @example ["prettier --write", "eslint --fix"]
 */
type ParallelTasks = (SpawnedTask | GenerateTask)[]

/**
 * List of tasks that will be run sequentially, in order
 *
 * @example ["prettier --write", "eslint --fix"]
 */
type SequentialTasks = (SpawnedTask | GenerateTask | ParallelTasks)[]

/**
 * A single Node.js/JavaScript task that defines its title and the function which will be
 * run with the list of the matched staged files as its argument.
 *
 * @example
 * {
 *   title: 'Log staged files',
 *   task: (files: readonly string[]) => {
 *     console.log('Staged files:', files)
 *   }
 * }
 */
type TaskFunction = {
  title: string
  task: (filepaths: readonly string[]) => void | Promise<void>
}

/** An entire `lint-staged` configuration, or a function that returns one */
export type Configuration =
  | Record<string, SpawnedTask | TaskFunction | GenerateTask | SequentialTasks>
  | GenerateTask

/** `lint-staged` Node.js API options */
export type Options = {
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

type Logger = {
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
