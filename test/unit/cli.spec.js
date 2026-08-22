import path from 'node:path'

import { describe, it, suite } from 'vitest'

import { getVersionNumber, parseCliOptions, printHelpText } from '../../lib/cli.js'

suite('cli', () => {
  describe('parseCliOptions', () => {
    it('should return default options', ({ expect }) => {
      const options = parseCliOptions()

      expect(options).toStrictEqual({
        allowEmpty: undefined,
        concurrent: undefined,
        configPath: undefined,
        continueOnError: undefined,
        cwd: undefined,
        debug: undefined,
        diff: undefined,
        diffFilter: undefined,
        failOnChanges: undefined,
        help: undefined,
        hidePartiallyStaged: undefined,
        hideUnstaged: undefined,
        hideAll: undefined,
        maxArgLength: undefined,
        quiet: undefined,
        relative: undefined,
        revert: undefined,
        stash: undefined,
        verbose: undefined,
        version: undefined,
      })
    })

    it('should parse diff option without applying defaults', ({ expect }) => {
      const options = parseCliOptions(['--diff=main...HEAD'])
      expect(options.diff).toBe('main...HEAD')
      expect(options.stash).toBeUndefined()
    })

    it('should parse concurrent=false option', ({ expect }) => {
      const options = parseCliOptions(['--concurrent=false'])
      expect(options.concurrent).toBe(false)
    })

    it('should parse concurrent=true option', ({ expect }) => {
      const options = parseCliOptions(['--concurrent=true'])
      expect(options.concurrent).toBe(true)
    })

    it('should parse concurrent=10 option', ({ expect }) => {
      const options = parseCliOptions(['--concurrent=10'])
      expect(options.concurrent).toBe(10)
    })

    it('should parse concurrent=Infinity option', ({ expect }) => {
      const options = parseCliOptions(['--concurrent=Infinity'])
      expect(options.concurrent).toBe(Infinity)
    })

    it('should throw when using max-arg-length without value', ({ expect }) => {
      expect(() => parseCliOptions(['--max-arg-length'])).toThrow(
        `Option '--max-arg-length <value>' argument missing`
      )
    })

    it('should parse max-arg-length option as integer', ({ expect }) => {
      const options = parseCliOptions(['--max-arg-length=100'])
      expect(options.maxArgLength).toBe(100)
    })
  })

  describe('getVersionNumber', () => {
    it('should return version number from package.json', async ({ expect }) => {
      const { default: packageJson } = await import(
        path.join(import.meta.dirname, '../../package.json'),
        { with: { as: 'json' } }
      )

      const version = await getVersionNumber()
      expect(version).toBe(packageJson.version)
    })
  })

  describe('printHelpText', () => {
    it('should print help text at width 120', async ({ expect }) => {
      const helpText = await printHelpText(180)

      expect(helpText).toMatchInlineSnapshot(`
        "Usage: lint-staged [options]

        -h, --help                         display this help message
        -V, --version                      display the current version number
        --allow-empty                      allow empty commits when tasks revert all staged changes (default: false)
        -p, --concurrent <number|boolean>  the number of tasks to run concurrently, or false for serial (default: true)
        -c, --config [path]                path to configuration file, or - to read from stdin
        --continue-on-error                run all tasks to completion even if one fails (default: false)
        --cwd [path]                       run all tasks in specific directory, instead of the current
        -d, --debug                        print additional debug information (default: false)
        --diff [string]                    override the default "--staged" flag of "git diff" to get list of files. Implies "--no-stash".
        --diff-filter [string]             override the default "--diff-filter=ACMR" flag of "git diff" to get list of files
        --fail-on-changes                  fail with exit code 1 when tasks modify tracked files (default: false)
        --no-hide-partially-staged         hide unstaged changes from partially staged files (default: true)
        --hide-unstaged                    hide all unstaged changes, instead of just partially staged (default: false)
        --hide-all                         hide all unstaged changes and untracked files (default: false)
        --max-arg-length [number]          maximum length of the command-line argument string (default: 0)
        -q, --quiet                        disable lint-staged's own console output (default: false)
        -r, --relative                     pass relative filepaths to tasks (default: false)
        --no-revert                        revert to original state in case of errors (default: true)
        --no-stash                         enable the backup stash (default: true)
        -v, --verbose                      show task output even when tasks succeed; by default only failed output is shown (default: false)

        Any lost modifications can be restored from a git stash:

          > git stash list --format="%h %s"
          <git-hash> On main: lint-staged automatic backup
          > git apply --index <git-hash>
        "
      `)
    })

    it('should print help text at undefined width', async ({ expect }) => {
      const helpText = await printHelpText(undefined)

      expect(helpText).toMatchInlineSnapshot(`
        "Usage: lint-staged [options]

        -h, --help                         display this help message
        -V, --version                      display the current version number
        --allow-empty                      allow empty commits when tasks revert all
                                           staged changes (default: false)
        -p, --concurrent <number|boolean>  the number of tasks to run concurrently, or
                                           false for serial (default: true)
        -c, --config [path]                path to configuration file, or - to read from
                                           stdin
        --continue-on-error                run all tasks to completion even if one fails
                                           (default: false)
        --cwd [path]                       run all tasks in specific directory, instead
                                           of the current
        -d, --debug                        print additional debug information (default:
                                           false)
        --diff [string]                    override the default "--staged" flag of "git
                                           diff" to get list of files. Implies
                                           "--no-stash".
        --diff-filter [string]             override the default "--diff-filter=ACMR"
                                           flag of "git diff" to get list of files
        --fail-on-changes                  fail with exit code 1 when tasks modify
                                           tracked files (default: false)
        --no-hide-partially-staged         hide unstaged changes from partially staged
                                           files (default: true)
        --hide-unstaged                    hide all unstaged changes, instead of just
                                           partially staged (default: false)
        --hide-all                         hide all unstaged changes and untracked files
                                           (default: false)
        --max-arg-length [number]          maximum length of the command-line argument
                                           string (default: 0)
        -q, --quiet                        disable lint-staged's own console output
                                           (default: false)
        -r, --relative                     pass relative filepaths to tasks (default:
                                           false)
        --no-revert                        revert to original state in case of errors
                                           (default: true)
        --no-stash                         enable the backup stash (default: true)
        -v, --verbose                      show task output even when tasks succeed; by
                                           default only failed output is shown (default:
                                           false)

        Any lost modifications can be restored from a git stash:

          > git stash list --format="%h %s"
          <git-hash> On main: lint-staged automatic backup
          > git apply --index <git-hash>
        "
      `)
    })
  })
})
