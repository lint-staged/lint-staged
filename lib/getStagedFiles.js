import path from 'node:path'

import { execGit } from './execGit.js'
import { readFile } from './file.js'
import { getDiffCommand } from './getDiffCommand.js'
import { normalizePath } from './normalizePath.js'
import { parseGitZOutput } from './parseGitZOutput.js'

/**
 * @typedef {'A'|'C'|'D'|'M'|'R'|'T'|'U'|'X'} FileSatus
 * @typedef { { filepath: string; status: FileSatus }} StagedFile
 */

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
 *
 * @param {string} output
 * @param {string} cwd
 * @return {StagedFile[]}
 *
 */
const parseGitDiffOutput = (output, cwd) => {
  if (!output) return []

  return output
    .slice(1)
    .split('\u0000:')
    .map(parseGitZOutput)
    .flatMap(([info, src, dst]) => {
      const [, dstMode, , , statusWithScore] = info.split(' ')

      /**
       * Filter out submodules and symlinks
       * @see https://github.com/git/git/blob/cb96e1697ad6e54d11fc920c95f82977f8e438f8/Documentation/git-fast-import.adoc?plain=1#L634-L646
       */
      if (dstMode === '160000' || dstMode === '120000') {
        return []
      }

      /**
       * @example "M"
       * @example "R86"
       *
       * - A: addition of a file
       * - C: copy of a file into a new one
       * - D: deletion of a file
       * - M: modification of the contents or mode of a file
       * - R: renaming of a file
       * - T: change in the type of the file (regular file, symbolic link or submodule)
       * - U: file is unmerged (you must complete the merge before it can be committed)
       * - X: "unknown" change type (most probably a bug, please report it)
       */
      const status = statusWithScore[0]

      /** "dst" exists when moving files, otherwise it's undefined and only "src" exists */
      const filename = dst ?? src

      return [
        {
          filepath: normalizePath(path.resolve(cwd, filename)),
          status,
        },
      ]
    })
}

/**
 * @param {Object} args
 * @param {string} args.cwd
 * @param {string} args.gitConfigDir
 * @param {string} [args.diff]
 * @param {string} [args.diffFilter]
 * @retuns {Promise<StagedFile[] | null>}
 */
export const getStagedFiles = async ({ cwd, gitConfigDir, diff, diffFilter }) => {
  try {
    /** @param {string[]} command */
    const getFiles = async (command) => {
      /**
       * With the raw output lines look like:
       *
       * :000000 100644 0000000 780ccd3\u0000A\u0000.gitmodules\u0000
       * :000000 160000 0000000 1bb568e\u0000A\u0000submodule\u0000
       *
       * @see https://git-scm.com/docs/git-diff#_raw_output_format
       */
      const output = await execGit([...command, '--raw', '-z'], { cwd })
      return parseGitDiffOutput(output, cwd)
    }

    const stagedFiles = await getFiles(getDiffCommand(diff, diffFilter))

    if (diff || stagedFiles.length === 0) {
      return stagedFiles
    }

    /** Detect in-progress merge */
    const mergeHead = await readFile(path.resolve(gitConfigDir, 'MERGE_HEAD'))
    if (!mergeHead) {
      return stagedFiles
    }

    const mergeHeadFiles = new Set(
      (await getFiles(['diff', '--staged', 'MERGE_HEAD'])).map(({ filepath }) => filepath)
    )

    /** During merge conflict, return only files changed in both HEAD and MERGE_HEAD */
    return stagedFiles.filter(({ filepath }) => mergeHeadFiles.has(filepath))
  } catch {
    return null
  }
}
