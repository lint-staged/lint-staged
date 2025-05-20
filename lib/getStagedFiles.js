import path from 'node:path'

import { execGit } from './execGit.js'
import { getDiffCommand } from './getDiffCommand.js'
import { normalizePath } from './normalizePath.js'
import { parseGitZOutput } from './parseGitZOutput.js'

export const getStagedFiles = async ({ cwd = process.cwd(), diff, diffFilter } = {}) => {
  try {
    /**
     * With the raw output lines look like:
     *
     * :000000 100644 0000000 780ccd3\u0000A\u0000.gitmodules\u0000
     * :000000 160000 0000000 1bb568e\u0000A\u0000submodule\u0000
     *
     * @see https://git-scm.com/docs/git-diff#_raw_output_format
     */
    const output = await execGit([...getDiffCommand(diff, diffFilter), '--raw', '-z'], { cwd })

    if (!output) return []

    /**
     * Split from all colons and remove the first one, after which lines will look like:
     *
     * 000000 100644 0000000 780ccd3 A\u0000.gitmodules\u0000
     * 000000 160000 0000000 47e5cff A\u0000submodule\u0000
     *
     * where '\u0000' is the NUL character from '-z' option. After that we
     * parse the lines by splitting from NUL, and then split the first
     * part from space. This yields us enough info both filter out submodule
     * roots and get the filename.
     */
    return output
      .slice(1)
      .split('\u0000:')
      .map(parseGitZOutput)
      .flatMap(([info, src, dst]) => {
        const [, dstMode, , , ,] = info.split(' ')

        /**
         * Filter out submodules and symlinks
         * @see https://github.com/git/git/blob/cb96e1697ad6e54d11fc920c95f82977f8e438f8/Documentation/git-fast-import.adoc?plain=1#L634-L646
         */
        if (dstMode === '160000' || dstMode === '120000') {
          return []
        }

        /** "dst" exists when moving files, otherwise it's undefined and only "src" exists */
        const filename = dst ?? src

        return [normalizePath(path.resolve(cwd, filename))]
      })
  } catch {
    return null
  }
}
