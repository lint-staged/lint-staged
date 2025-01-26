type SyncFunctionTask = (stagedFileNames: string[]) => string | string[]

type AsyncFunctionTask = (stagedFileNames: string[]) => Promise<string | string[]>

type FunctionTask = SyncFunctionTask | AsyncFunctionTask

export type Configuration =
  | Record<string, string | FunctionTask | (string | FunctionTask)[]>
  | FunctionTask

export type Options = {
  /**
   * Allow empty commits when tasks revert all staged changes
   * @default false
   */
  allowEmpty?: boolean
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
   * Maximum argument string length, by default automatically detected
   */
  maxArgLength?: number
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
   * Skip parsing of tasks for better shell support
   * @default false
   */
  shell?: boolean
  /**
   * Enable the backup stash, and revert in case of errors.
   * @warn Disabling this also implies `hidePartiallyStaged: false`.
   * @default true
   */
  stash?: boolean
  /**
   * Whether to hide unstaged changes from partially staged files before running tasks
   * @default true
   */
  hidePartiallyStaged?: boolean
  /**
   * Show task output even when tasks succeed; by default only failed output is shown
   * @default false
   */
  verbose?: boolean
}

type LogFunction = (...params: any) => void

type Logger = {
  log: LogFunction
  warn: LogFunction
  error: LogFunction
}

/**
 * @returns {boolean} `true` when all tasks were successful, `false` when some tasks failed with errors
 * @throws {Error} when failed to some other errors
 */
export default function lintStaged(options: Options, logger?: Logger): Promise<boolean>
