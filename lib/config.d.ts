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

/**
 * TypeScript helper to define `lint-staged` configuration.
 * Use as the default export in a configuration file like `lint-staged.config.js`.
 *
 * @example
 * export default defineConfig({
 *   "*.js": ["prettier --check", "eslint"]
 * })
 */
export const defineConfig = (config: Configuration) => config
