type SyncFunctionTask = (stagedFileNames: string[]) => string | string[]

type AsyncFunctionTask = (stagedFileNames: string[]) => Promise<string | string[]>

type FunctionTask = SyncFunctionTask | AsyncFunctionTask

export type Configuration =
  | Record<string, string | FunctionTask | (string | FunctionTask)[]>
  | FunctionTask
